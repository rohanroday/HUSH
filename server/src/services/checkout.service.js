import config from "../config/config.js";
import orderModel from "../models/order.model.js";
import cartModel from "../models/cart.model.js";
import { releaseOrderStock, reserveAll } from "./stock.service.js";
import {
  ensureCaptured,
  fetchOrderPayments,
  fetchRefund,
  refundPayment,
} from "./payment.service.js";
import { notifyLowStock, notifySellersOfNewOrder, safely } from "./notification.service.js";

// Validates the buyer's cart and turns it into order lines. Returns either
// { error: { status, body } } or everything needed to reserve and charge.
export async function prepareCart(userId) {
  const cart = await cartModel.findOne({ userId }).populate("products.productId");
  if (!cart || cart.products.length === 0) {
    return { error: { status: 400, body: { message: "Cart is empty" } } };
  }
  if (cart.products.some((p) => !p.productId)) {
    return { error: { status: 400, body: { message: "Cart has products that no longer exist" } } };
  }
  if (cart.products.some((p) => !p.productId.isPublished)) {
    return { error: { status: 400, body: { message: "Cart has products that are no longer for sale" } } };
  }

  const currencies = new Set(cart.products.map((p) => p.productId.price.currency));
  if (currencies.size > 1) {
    return { error: { status: 400, body: { message: "Cart has products in different currencies" } } };
  }
  const [currency] = currencies;

  const sizeError = [];
  for (const p of cart.products) {
    const size = p.productId.sizes.find((s) => s.size === p.size);
    if (!size) {
      sizeError.push({ productId: p.productId._id, message: `Size ${p.size} not available` });
    } else if (size.stock < p.quantity) {
      sizeError.push({
        productId: p.productId._id,
        message: `Only ${size.stock} left in size ${p.size} for ${p.productId.title}`,
      });
    }
  }
  if (sizeError.length > 0) {
    return { error: { status: 400, body: { message: sizeError.map((e) => e.message).join("; "), sizeError } } };
  }

  const lines = cart.products.map((p) => ({
    product: {
      title: p.productId.title,
      price: p.productId.price,
      description: p.productId.description,
      image: p.productId.images[0]?.url ?? "",
      productId: p.productId._id,
    },
    size: p.size,
    quantity: p.quantity,
  }));
  const stockItems = cart.products.map((p) => ({
    productId: p.productId._id,
    size: p.size,
    quantity: p.quantity,
  }));
  const itemsTotal = cart.products.reduce((acc, p) => acc + p.productId.price.amount * p.quantity, 0);

  return { currency, lines, stockItems, itemsTotal };
}

function paidFields(payment, signature) {
  return {
    status: "PLACED",
    "payment.status": "PAID",
    "payment.razorpayPaymentId": payment.id,
    "payment.method": payment.method,
    "payment.paidAt": new Date(),
    ...(signature ? { "payment.razorpaySignature": signature } : {}),
  };
}

async function afterPaid(order) {
  await cartModel.updateOne({ userId: order.userId }, { $set: { products: [] } });
  safely(notifySellersOfNewOrder(order), "new order");
  safely(notifyLowStock(order), "low stock");
}

// Turns a held checkout into a real, paid order. Only the first caller wins
// (the buyer's verify request, the abandon check or the expiry sweep), so
// sellers are notified and the cart cleared exactly once.
export async function finalizePaidOrder(order, payment, signature) {
  const updated = await orderModel.findOneAndUpdate(
    { _id: order._id, status: "PAYMENT_PENDING", "payment.status": "CREATED" },
    { $set: paidFields(payment, signature) },
    { new: true }
  );
  if (!updated) return null;
  await afterPaid(updated);
  return updated;
}

// A checkout whose stock has already gone back on sale (failed payment,
// closed window or expired hold).
export function isReleased(order) {
  return order.status === "CANCELLED" && order.payment?.status === "FAILED";
}

const RELEASED = { status: "CANCELLED", "payment.status": "FAILED" };

// Money arrived for a checkout that was already released (the buyer retried
// after a failed attempt, or the bank confirmed late). Take the stock again
// if it is still there and place the order; otherwise refund in full.
// Returns { outcome: "paid", order } or an outcome of "refunded",
// "refund_failed" or "raced" (someone else settled it first).
export async function recoverReleasedOrder(order, payment, signature) {
  const items = order.products.map((p) => ({
    productId: p.product.productId,
    size: p.size,
    quantity: p.quantity,
  }));
  const soldOut = await reserveAll(items);

  if (!soldOut) {
    const updated = await orderModel.findOneAndUpdate(
      { _id: order._id, ...RELEASED },
      { $set: paidFields(payment, signature) },
      { new: true }
    );
    if (updated) {
      await afterPaid(updated);
      return { outcome: "paid", order: updated };
    }
    // someone else settled this order in the meantime; give the stock back
    await releaseOrderStock(order);
    return { outcome: "raced" };
  }

  // Claim the refund first so two callers can never refund the same payment.
  const claimed = await orderModel.updateOne(
    { _id: order._id, ...RELEASED },
    {
      $set: {
        "payment.status": "REFUND_PENDING",
        "payment.razorpayPaymentId": payment.id,
        "payment.method": payment.method,
      },
    }
  );
  if (claimed.modifiedCount === 0) return { outcome: "raced" };
  try {
    const refund = await refundPayment(payment.id, order.totalPrice.amount, {
      hushOrderId: order._id.toString(),
      reason: "sold out before payment arrived",
    });
    await orderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          "payment.status": refund.status === "processed" ? "REFUNDED" : "REFUND_PENDING",
          "payment.refundId": refund.id,
          "payment.refundedAt": new Date(),
        },
      }
    );
    return { outcome: "refunded" };
  } catch (err) {
    // put it back so the sweep tries the refund again
    await orderModel.updateOne(
      { _id: order._id, "payment.status": "REFUND_PENDING", "payment.refundId": { $exists: false } },
      { $set: { "payment.status": "FAILED" } }
    );
    console.error(`refund for released order ${order._id} failed:`, err?.error?.description || err.message);
    return { outcome: "refund_failed", paymentId: payment.id };
  }
}

// Asks Razorpay whether a released checkout was paid after all, and if so
// places or refunds it. Returns "released" (no money arrived), "paid",
// "refunded", "refund_failed", "raced", or "unknown" if Razorpay can't be reached.
export async function settleReleasedOrder(order) {
  if (!order.payment?.razorpayOrderId) return "released";
  let payment;
  try {
    const payments = await fetchOrderPayments(order.payment.razorpayOrderId);
    payment = payments.find((p) => p.status === "captured" || p.status === "authorized");
    if (!payment) return "released";
    payment = await ensureCaptured(payment);
  } catch (err) {
    console.error(`could not check released order ${order._id}:`, err?.error?.description || err.message);
    return "unknown";
  }
  return (await recoverReleasedOrder(order, payment)).outcome;
}

// Releases a held checkout's stock and marks it abandoned. Returns true only
// for the caller that actually released it.
export async function releaseHeldOrder(order) {
  const result = await orderModel.updateOne(
    { _id: order._id, status: "PAYMENT_PENDING", "payment.status": "CREATED" },
    { $set: { status: "CANCELLED", "payment.status": "FAILED" } }
  );
  if (result.modifiedCount === 0) return false;
  await releaseOrderStock(order);
  return true;
}

// Decides what happened to a checkout the buyer never confirmed: asks
// Razorpay whether money actually arrived before giving the stock back.
// Returns "paid", "released", or "unknown" when Razorpay can't be reached.
export async function reconcileHeldOrder(order) {
  if (!order.payment?.razorpayOrderId) {
    return (await releaseHeldOrder(order)) ? "released" : "unknown";
  }
  let payments;
  try {
    payments = await fetchOrderPayments(order.payment.razorpayOrderId);
  } catch (err) {
    console.error(`could not reconcile order ${order._id}:`, err?.error?.description || err.message);
    return "unknown";
  }
  const successful = payments.find((p) => p.status === "captured" || p.status === "authorized");
  if (successful) {
    let captured;
    try {
      captured = await ensureCaptured(successful);
    } catch (err) {
      // leave the hold in place; the next sweep will try the capture again
      console.error(`could not capture payment for order ${order._id}:`, err?.error?.description || err.message);
      return "unknown";
    }
    await finalizePaidOrder(order, captured);
    return "paid";
  }
  await releaseHeldOrder(order);
  return "released";
}

// Refunds a paid order in full. Throws if Razorpay rejects the refund so the
// caller can keep the order as it was rather than cancel without refunding.
export async function refundIfPaid(order, reason) {
  if (order.payment?.status !== "PAID" || !order.payment.razorpayPaymentId) {
    return { refunded: false };
  }
  const refund = await refundPayment(order.payment.razorpayPaymentId, order.totalPrice.amount, {
    hushOrderId: order._id.toString(),
    reason,
  });
  await orderModel.updateOne(
    { _id: order._id },
    {
      $set: {
        "payment.status": refund.status === "processed" ? "REFUNDED" : "REFUND_PENDING",
        "payment.refundId": refund.id,
        "payment.refundedAt": new Date(),
      },
    }
  );
  return { refunded: true, refund };
}

// Checkouts left open (closed tab, lost connection) hold stock; sweep them.
// Also double-checks released checkouts once the payment window can no longer
// be open, in case money arrived after the stock went back on sale.
export function startPaymentSweeper() {
  const holdMs = config.PAYMENT_HOLD_MINUTES * 60 * 1000;
  const lateCheckMs = holdMs + 10 * 60 * 1000;
  const sweep = async () => {
    try {
      const stale = await orderModel.find({
        status: "PAYMENT_PENDING",
        createdAt: { $lt: new Date(Date.now() - holdMs) },
      });
      for (const order of stale) {
        const outcome = await reconcileHeldOrder(order);
        console.log(`payment sweep: order ${order._id} -> ${outcome}`);
      }

      const released = await orderModel.find({
        ...RELEASED,
        "payment.razorpayOrderId": { $exists: true },
        "payment.lateChecked": { $ne: true },
        createdAt: { $lt: new Date(Date.now() - lateCheckMs), $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });
      for (const order of released) {
        const outcome = await settleReleasedOrder(order);
        if (outcome === "released") {
          await orderModel.updateOne({ _id: order._id, ...RELEASED }, { $set: { "payment.lateChecked": true } });
        } else {
          console.log(`payment sweep: released order ${order._id} -> ${outcome}`);
        }
      }
    } catch (err) {
      console.error("payment sweep failed:", err.message);
    }
  };
  const timer = setInterval(sweep, 60 * 1000);
  timer.unref();
  sweep();
}

const refundCheckedAt = new Map();

// Refunds start "pending" at Razorpay and settle later. Whenever orders are
// listed, ask about the ones still pending so the status catches up.
export async function syncPendingRefunds(orders) {
  // order pages refresh themselves every few seconds; ask Razorpay about each
  // refund at most once a minute
  const now = Date.now();
  const pending = orders.filter((o) => {
    if (o.payment?.status !== "REFUND_PENDING" || !o.payment.refundId) return false;
    const id = o._id.toString();
    if (now - (refundCheckedAt.get(id) ?? 0) < 60 * 1000) return false;
    refundCheckedAt.set(id, now);
    return true;
  });
  await Promise.all(
    pending.map(async (order) => {
      try {
        const refund = await fetchRefund(order.payment.refundId);
        if (refund.status === "processed") {
          await orderModel.updateOne({ _id: order._id }, { $set: { "payment.status": "REFUNDED" } });
          order.payment.status = "REFUNDED";
          refundCheckedAt.delete(order._id.toString());
        }
      } catch (err) {
        console.error(`refund sync for ${order._id} failed:`, err?.error?.description || err.message);
      }
    })
  );
  return orders;
}
