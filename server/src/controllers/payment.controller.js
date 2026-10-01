import config from "../config/config.js";
import orderModel from "../models/order.model.js";
import userModel from "../models/user.model.js";
import { reserveAll, releaseOrderStock } from "../services/stock.service.js";
import {
  createRazorpayOrder,
  describeRazorpayError,
  ensureCaptured,
  fetchPayment,
  isValidPaymentSignature,
  toSubunits,
} from "../services/payment.service.js";
import {
  finalizePaidOrder,
  isReleased,
  prepareCart,
  reconcileHeldOrder,
  recoverReleasedOrder,
  settleReleasedOrder,
} from "../services/checkout.service.js";

// Step 1: hold the stock, create a HUSH order awaiting payment and the
// matching Razorpay order the checkout modal will charge against.
export async function startCheckout(req, res) {
  const userId = req.user.id;

  // A buyer retrying checkout: settle any earlier attempt first. If one of
  // them was in fact paid, don't let them pay twice.
  const earlier = await orderModel.find({ userId, status: "PAYMENT_PENDING" });
  for (const order of earlier) {
    if ((await reconcileHeldOrder(order)) === "paid") {
      return res.status(409).json({
        message: "Your previous payment went through. Check your orders before paying again.",
        data: { orderId: order._id },
      });
    }
  }

  const prepared = await prepareCart(userId);
  if (prepared.error) {
    return res.status(prepared.error.status).json(prepared.error.body);
  }
  const { currency, lines, stockItems, itemsTotal } = prepared;

  const failed = await reserveAll(stockItems);
  if (failed) {
    return res.status(409).json({
      message: `Size ${failed.size} just sold out on one of your items. Please review your bag.`,
    });
  }

  const total = itemsTotal + config.SHIPPING_FEE;
  const order = await orderModel.create({
    userId,
    address: (({ house, street, city, state, zip, phone }) => ({ house, street, city, state, zip, phone }))(req.body.address),
    products: lines,
    shippingFee: config.SHIPPING_FEE,
    totalPrice: { amount: total, currency },
    status: "PAYMENT_PENDING",
    payment: { provider: "razorpay", status: "CREATED" },
  });

  let razorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder({
      amount: total,
      currency,
      receipt: order._id.toString(),
      notes: { hushOrderId: order._id.toString(), userId: userId.toString() },
    });
  } catch (err) {
    await releaseOrderStock(order);
    await orderModel.deleteOne({ _id: order._id });
    return res.status(502).json({ message: `Couldn't start the payment: ${describeRazorpayError(err)}` });
  }

  order.payment.razorpayOrderId = razorpayOrder.id;
  await order.save();

  const buyer = await userModel.findById(userId).select("name email");
  return res.status(201).json({
    message: "Checkout started",
    data: {
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: config.RAZORPAY_KEY_ID,
      prefill: { name: buyer?.name ?? "", email: buyer?.email ?? "", contact: order.address.phone ?? "" },
      holdMinutes: config.PAYMENT_HOLD_MINUTES,
    },
  });
}

// Step 2: the checkout modal reports success. Trust nothing from the browser
// until the signature checks out and Razorpay confirms the amount.
export async function verifyPayment(req, res) {
  const {
    orderId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: signature,
  } = req.body;

  const order = await orderModel.findOne({ _id: orderId, userId: req.user.id });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (!order.payment?.razorpayOrderId || order.payment.razorpayOrderId !== razorpayOrderId) {
    return res.status(400).json({ message: "This payment doesn't belong to this order" });
  }
  if (!isValidPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature })) {
    return res.status(400).json({ message: "We couldn't verify this payment. If money left your account, contact us with the payment ID and we'll sort it out." });
  }
  if (order.payment.status === "PAID") {
    return res.status(200).json({ message: "Payment already confirmed", data: { order } });
  }
  if (order.payment.status === "REFUND_PENDING" || order.payment.status === "REFUNDED") {
    return res.status(409).json({ message: "This payment has already been refunded in full." });
  }

  let payment;
  try {
    payment = await fetchPayment(razorpayPaymentId);
    const expectedAmount = toSubunits(order.totalPrice.amount);
    if (
      payment.order_id !== razorpayOrderId ||
      payment.amount !== expectedAmount ||
      payment.currency !== order.totalPrice.currency
    ) {
      return res.status(400).json({ message: "Payment details don't match this order" });
    }
    if (payment.status !== "captured" && payment.status !== "authorized") {
      return res.status(402).json({ message: `Payment was not completed (status: ${payment.status})` });
    }
    payment = await ensureCaptured(payment);
  } catch (err) {
    return res.status(502).json({
      message: `Couldn't confirm the payment with Razorpay: ${describeRazorpayError(err)}. If you were charged, your order will be confirmed automatically within a few minutes.`,
    });
  }

  const paid = await finalizePaidOrder(order, payment, signature);
  if (paid) {
    return res.status(200).json({ message: "Payment confirmed", data: { order: paid } });
  }

  let current = await orderModel.findById(order._id);
  if (current.payment.status === "PAID") {
    return res.status(200).json({ message: "Payment confirmed", data: { order: current } });
  }

  // The stock had already gone back on sale (an earlier attempt failed, or
  // the hold expired) before this payment arrived. Take it again if it is
  // still there; otherwise give the money back rather than keep it for an
  // order we can't fill.
  if (isReleased(current)) {
    const result = await recoverReleasedOrder(current, payment, signature);
    if (result.outcome === "paid") {
      return res.status(200).json({ message: "Payment confirmed", data: { order: result.order } });
    }
    if (result.outcome === "refunded") {
      return res.status(409).json({
        message: "Sorry, this sold out before your payment arrived, so we've refunded it in full. Please review your bag.",
      });
    }
    if (result.outcome === "refund_failed") {
      return res.status(409).json({
        message: "This sold out before your payment arrived. Your refund is on its way; if it doesn't arrive in a few days, contact us with your payment ID.",
        data: { paymentId: payment.id },
      });
    }
    current = await orderModel.findById(order._id);
    if (current.payment.status === "PAID") {
      return res.status(200).json({ message: "Payment confirmed", data: { order: current } });
    }
  }
  return res.status(409).json({
    message: "We couldn't place this order. If you were charged it is being refunded; check your orders in a few minutes.",
  });
}

// The buyer closed the checkout modal. Double-check with Razorpay before
// putting the stock back, in case the payment went through anyway.
export async function abandonCheckout(req, res) {
  const order = await orderModel.findOne({ _id: req.params.orderId, userId: req.user.id });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.payment?.status === "PAID") {
    return res.status(200).json({ message: "Payment received", data: { outcome: "paid", order } });
  }
  if (order.status !== "PAYMENT_PENDING" && !isReleased(order)) {
    return res.status(200).json({ message: "Nothing to release", data: { outcome: order.status, order } });
  }
  // already released (the payment failed earlier): make sure no money has
  // arrived since, otherwise check with Razorpay and release the hold
  const outcome = isReleased(order) ? await settleReleasedOrder(order) : await reconcileHeldOrder(order);
  const fresh = await orderModel.findById(order._id);
  return res.status(200).json({
    message: outcome === "paid" ? "Payment received" : "Checkout released",
    data: { outcome, order: fresh },
  });
}
