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
  refundPayment,
  toSubunits,
} from "../services/payment.service.js";
import {
  finalizePaidOrder,
  prepareCart,
  reconcileHeldOrder,
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
    address: req.body.address,
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
      prefill: { name: buyer?.name ?? "", email: buyer?.email ?? "" },
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

  const current = await orderModel.findById(order._id);
  if (current.payment.status === "PAID") {
    return res.status(200).json({ message: "Payment confirmed", data: { order: current } });
  }

  // The hold expired and the stock went back on sale before the money
  // arrived. Give it back rather than keep money for an order we can't fill.
  try {
    const refund = await refundPayment(payment.id, order.totalPrice.amount, {
      hushOrderId: order._id.toString(),
      reason: "checkout expired before payment",
    });
    await orderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          "payment.razorpayPaymentId": payment.id,
          "payment.status": refund.status === "processed" ? "REFUNDED" : "REFUND_PENDING",
          "payment.refundId": refund.id,
          "payment.refundedAt": new Date(),
        },
      }
    );
  } catch (err) {
    console.error(`refund for expired order ${order._id} failed:`, describeRazorpayError(err));
    return res.status(409).json({
      message: "Your checkout expired before the payment arrived. Contact us with your payment ID and we'll refund it.",
      data: { paymentId: payment.id },
    });
  }
  return res.status(409).json({
    message: "Your checkout expired before the payment arrived, so we've refunded it in full. Please place the order again.",
  });
}

// The buyer closed the checkout modal. Double-check with Razorpay before
// putting the stock back, in case the payment went through anyway.
export async function abandonCheckout(req, res) {
  const order = await orderModel.findOne({ _id: req.params.orderId, userId: req.user.id });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.status !== "PAYMENT_PENDING") {
    return res.status(200).json({ message: "Nothing to release", data: { outcome: order.status, order } });
  }
  const outcome = await reconcileHeldOrder(order);
  const fresh = await orderModel.findById(order._id);
  return res.status(200).json({
    message: outcome === "paid" ? "Payment received" : "Checkout released",
    data: { outcome, order: fresh },
  });
}
