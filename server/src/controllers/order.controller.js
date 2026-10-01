import orderModel from "../models/order.model.js";
import productModel from "../models/product.model.js";
import userModel from "../models/user.model.js";
import { releaseOrderStock } from "../services/stock.service.js";
import { refundIfPaid, syncPendingRefunds } from "../services/checkout.service.js";
import { describeRazorpayError } from "../services/payment.service.js";
import {
  notifySellersOfCancellation,
  notifySellersOfCancellationRequest,
  safely,
} from "../services/notification.service.js";

// Where a seller can move an order next. Sellers may still cancel (and
// refund) a shipped parcel; buyers can only cancel before it ships.
// Delivered and cancelled are final.
const NEXT_STATUSES = {
  PLACED: ["PENDING", "SHIPPED", "CANCELLED"],
  PENDING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

function awaitingDecision(order) {
  return order.cancellationRequest?.status === "REQUESTED";
}

// While a buyer is waiting on a cancellation request the seller has to answer
// it (approve = cancel, or decline) before moving the parcel on.
function nextStatusesFor(order) {
  const next = NEXT_STATUSES[order.status] ?? [];
  return awaitingDecision(order) ? next.filter((s) => s === "CANCELLED") : next;
}

async function sellerOwnsOrder(order, sellerId) {
  const productIds = order.products.map((p) => p.product.productId);
  return Boolean(await productModel.exists({ _id: { $in: productIds }, seller: sellerId }));
}

// Checkouts that were never paid (still open, or abandoned) aren't orders.
const REAL_ORDERS = { status: { $ne: "PAYMENT_PENDING" }, "payment.status": { $ne: "FAILED" } };

export async function getOrders(req, res) {
  const user = req.user;
  const orders = await orderModel.find({ userId: user.id, ...REAL_ORDERS }).sort({ createdAt: -1 });
  await syncPendingRefunds(orders);
  return res.status(200).json({ message: "Orders fetched successfully", data: { orders } });
}

export async function getSellerOrders(req, res) {
  const user = req.user;
  if (user.role !== "seller") {
    return res.status(403).json({ message: "Only sellers can view their orders" });
  }
  const sellerProducts = await productModel.find({ seller: user.id }).select("_id");
  const productIds = sellerProducts.map((p) => p._id.toString());

  const orders = await orderModel
    .find({ "products.product.productId": { $in: productIds }, ...REAL_ORDERS })
    .sort({ createdAt: -1 })
    .lean();
  await syncPendingRefunds(orders);

  const customers = await userModel
    .find({ _id: { $in: [...new Set(orders.map((o) => o.userId.toString()))] } })
    .select("name email")
    .lean();
  const customerById = new Map(customers.map((c) => [c._id.toString(), c]));

  // only show the seller the line items that are theirs
  const data = orders.map((order) => {
    const products = order.products.filter((p) =>
      productIds.includes(p.product.productId.toString())
    );
    const customer = customerById.get(order.userId.toString());
    return {
      ...order,
      products,
      sellerTotal: products.reduce((acc, p) => acc + p.product.price.amount * p.quantity, 0),
      customer: customer ? { name: customer.name, email: customer.email } : null,
      nextStatuses: nextStatusesFor(order),
    };
  });

  return res.status(200).json({ message: "Orders fetched successfully", data: { orders: data } });
}

// Cancels an order in its current status: flips the status first so only one
// request can win, refunds a paid order, and rolls back if the refund fails.
async function cancelWithRefund(order, { byBuyer }) {
  const flipped = await orderModel.updateOne(
    { _id: order._id, status: order.status },
    { $set: { status: "CANCELLED" } }
  );
  if (flipped.modifiedCount === 0) {
    return { error: { status: 409, message: "Order status changed, please refresh and try again" } };
  }

  let refunded = false;
  try {
    ({ refunded } = await refundIfPaid(order, byBuyer ? "cancelled by customer" : "cancelled by seller"));
  } catch (err) {
    await orderModel.updateOne({ _id: order._id, status: "CANCELLED" }, { $set: { status: order.status } });
    return {
      error: { status: 502, message: `The refund couldn't be started, so the order is unchanged: ${describeRazorpayError(err)}` },
    };
  }

  await releaseOrderStock(order);
  safely(notifySellersOfCancellation(order, { byBuyer, refunded }), "cancellation");
  return { refunded };
}

export async function cancelOrder(req, res) {
  const user = req.user;
  const { orderId } = req.params;
  const order = await orderModel.findOne({ _id: orderId });
  if (!order || order.status === "PAYMENT_PENDING") {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.userId.toString() !== user.id.toString()) {
    return res.status(403).json({ message: "You are not authorized to cancel this order" });
  }
  if (order.status === "CANCELLED") {
    return res.status(400).json({ message: "Order is already cancelled" });
  }
  if (["DELIVERED", "SHIPPED"].includes(order.status)) {
    return res.status(400).json({
      message: `This order has already ${order.status === "SHIPPED" ? "shipped" : "been delivered"}, so it can no longer be cancelled here. Contact us and we'll help.`,
    });
  }

  const result = await cancelWithRefund(order, { byBuyer: true });
  if (result.error) {
    return res.status(result.error.status).json({ message: result.error.message });
  }
  return res.status(200).json({
    message: result.refunded
      ? "Order cancelled. Your refund has been started and usually reaches you in 5–7 working days."
      : "Order cancelled successfully",
  });
}

export async function updateOrderStatus(req, res) {
  const user = req.user;
  if (user.role !== "seller") {
    return res.status(403).json({ message: "You are not authorized to update order status" });
  }
  const { orderId } = req.params;
  const order = await orderModel.findOne({ _id: orderId });
  if (!order || order.status === "PAYMENT_PENDING") {
    return res.status(404).json({ message: "Order not found" });
  }

  if (!(await sellerOwnsOrder(order, user.id))) {
    return res.status(403).json({ message: "You can only update orders that contain your products" });
  }

  const { status } = req.body;
  if (typeof status !== "string" || !Object.hasOwn(NEXT_STATUSES, status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  if (status === order.status) {
    return res.status(200).json({ message: "Order status unchanged" });
  }
  if (awaitingDecision(order) && status !== "CANCELLED") {
    return res.status(409).json({
      message: "The customer has asked to cancel this order. Approve or decline the request first.",
    });
  }
  if (!NEXT_STATUSES[order.status].includes(status)) {
    return res.status(400).json({
      message: `A ${order.status.toLowerCase()} order can't be moved to ${status.toLowerCase()}`,
    });
  }

  if (status === "CANCELLED") {
    const result = await cancelWithRefund(order, { byBuyer: false });
    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }
    if (awaitingDecision(order)) {
      await orderModel.updateOne(
        { _id: order._id },
        { $set: { "cancellationRequest.status": "APPROVED", "cancellationRequest.respondedAt": new Date() } }
      );
    }
    return res.status(200).json({
      message: result.refunded ? "Order cancelled and the customer's refund has been started" : "Order cancelled",
    });
  }

  const result = await orderModel.updateOne(
    { _id: orderId, status: order.status },
    { $set: { status } }
  );
  if (result.modifiedCount === 0) {
    return res.status(409).json({ message: "Order status changed, please refresh and try again" });
  }
  return res.status(200).json({ message: "Order status updated successfully" });
}

// Buyer: ask to cancel a parcel that has already shipped.
export async function requestCancellation(req, res) {
  const user = req.user;
  const reason = req.body.reason?.trim();
  const order = await orderModel.findOne({ _id: req.params.orderId, userId: user.id });
  if (!order || order.status === "PAYMENT_PENDING") {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.status !== "SHIPPED") {
    return res.status(400).json({
      message:
        order.status === "PLACED" || order.status === "PENDING"
          ? "This order hasn't shipped yet, so you can cancel it directly."
          : `A ${order.status.toLowerCase()} order can't be cancelled.`,
    });
  }
  if (order.cancellationRequest?.status) {
    return res.status(409).json({ message: "You've already asked to cancel this order." });
  }

  const updated = await orderModel.findOneAndUpdate(
    { _id: order._id, status: "SHIPPED", "cancellationRequest.status": { $exists: false } },
    { $set: { cancellationRequest: { status: "REQUESTED", reason, requestedAt: new Date() } } },
    { new: true }
  );
  if (!updated) {
    return res.status(409).json({ message: "This order just changed. Please refresh and try again." });
  }
  safely(notifySellersOfCancellationRequest(updated), "cancellation request");
  return res.status(200).json({
    message: "Request sent. The seller will review it and you'll see their answer here.",
    data: { order: updated },
  });
}

// Seller: approve (cancel + refund) or decline a buyer's cancellation request.
export async function respondToCancellation(req, res) {
  const user = req.user;
  if (user.role !== "seller") {
    return res.status(403).json({ message: "Only sellers can respond to cancellation requests" });
  }
  const { decision } = req.body;
  const note = req.body.note?.trim() || undefined;
  const order = await orderModel.findOne({ _id: req.params.orderId });
  if (!order || order.status === "PAYMENT_PENDING") {
    return res.status(404).json({ message: "Order not found" });
  }
  if (!(await sellerOwnsOrder(order, user.id))) {
    return res.status(403).json({ message: "You can only respond for orders that contain your products" });
  }
  if (!awaitingDecision(order)) {
    return res.status(400).json({ message: "There's no open cancellation request on this order" });
  }

  if (decision === "DECLINE") {
    const result = await orderModel.updateOne(
      { _id: order._id, "cancellationRequest.status": "REQUESTED" },
      {
        $set: {
          "cancellationRequest.status": "DECLINED",
          "cancellationRequest.respondedAt": new Date(),
          "cancellationRequest.sellerNote": note,
        },
      }
    );
    if (result.modifiedCount === 0) {
      return res.status(409).json({ message: "This request was already answered. Please refresh." });
    }
    return res.status(200).json({ message: "Request declined. The customer will see your note on their order." });
  }

  // APPROVE: cancel and refund exactly like a seller cancellation.
  const result = await cancelWithRefund(order, { byBuyer: true });
  if (result.error) {
    return res.status(result.error.status).json({ message: result.error.message });
  }
  await orderModel.updateOne(
    { _id: order._id },
    {
      $set: {
        "cancellationRequest.status": "APPROVED",
        "cancellationRequest.respondedAt": new Date(),
        "cancellationRequest.sellerNote": note,
      },
    }
  );
  return res.status(200).json({
    message: result.refunded
      ? "Cancellation approved and the customer's refund has been started"
      : "Cancellation approved",
  });
}
