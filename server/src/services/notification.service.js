import notificationModel from "../models/notification.model.js";
import productModel from "../models/product.model.js";
import userModel from "../models/user.model.js";

const LOW_STOCK_THRESHOLD = 3;

function shortId(id) {
  return id.toString().slice(-6).toUpperCase();
}

function money(amount, currency) {
  const symbol = currency === "USD" ? "$" : "₹";
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

// Groups an order's line items by the seller who owns each product.
async function itemsBySeller(order) {
  const ids = order.products.map((p) => p.product.productId);
  const products = await productModel.find({ _id: { $in: ids } }).select("seller");
  const sellerOf = new Map(products.map((p) => [p._id.toString(), p.seller.toString()]));
  const groups = new Map();
  for (const item of order.products) {
    const seller = sellerOf.get(item.product.productId.toString());
    if (!seller) continue;
    if (!groups.has(seller)) groups.set(seller, []);
    groups.get(seller).push(item);
  }
  return groups;
}

function summarize(items, currency) {
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const total = items.reduce((n, i) => n + i.product.price.amount * i.quantity, 0);
  return `${count} ${count === 1 ? "item" : "items"} · ${money(total, currency)}`;
}

export async function notifySellersOfNewOrder(order) {
  const [groups, buyer] = await Promise.all([
    itemsBySeller(order),
    userModel.findById(order.userId).select("name"),
  ]);
  const where = order.address?.city ? `, ${order.address.city}` : "";
  const docs = [...groups].map(([sellerId, items]) => ({
    userId: sellerId,
    type: "NEW_ORDER",
    title: `New paid order #${shortId(order._id)}`,
    body: `${summarize(items, order.totalPrice.currency)} from ${buyer?.name ?? "a customer"}${where}. Ready to pack.`,
    orderId: order._id,
  }));
  if (docs.length) await notificationModel.insertMany(docs);
}

export async function notifySellersOfCancellation(order, { byBuyer, refunded }) {
  const groups = await itemsBySeller(order);
  const refundNote = refunded ? " The payment is being refunded." : "";
  const docs = [...groups].map(([sellerId, items]) => ({
    userId: sellerId,
    type: "ORDER_CANCELLED",
    title: `Order #${shortId(order._id)} cancelled`,
    body: `${byBuyer ? "The customer cancelled" : "Cancelled"} ${summarize(items, order.totalPrice.currency)}. Stock has been returned.${refundNote}`,
    orderId: order._id,
  }));
  if (docs.length) await notificationModel.insertMany(docs);
}

// After stock leaves the shelf, warn sellers about sizes that are nearly gone.
export async function notifyLowStock(order) {
  const ids = [...new Set(order.products.map((p) => p.product.productId.toString()))];
  const products = await productModel.find({ _id: { $in: ids } });
  const docs = [];
  for (const product of products) {
    const orderedSizes = order.products
      .filter((p) => p.product.productId.toString() === product._id.toString())
      .map((p) => p.size);
    const low = product.sizes.filter((s) => orderedSizes.includes(s.size) && s.stock <= LOW_STOCK_THRESHOLD);
    if (!low.length) continue;
    const detail = low.map((s) => (s.stock === 0 ? `${s.size} sold out` : `${s.size}: ${s.stock} left`)).join(", ");
    docs.push({
      userId: product.seller,
      type: "LOW_STOCK",
      title: `Low stock: ${product.title.replace(/^Men /, "")}`,
      body: `${detail}. Restock from your products page.`,
      productId: product._id,
    });
  }
  if (docs.length) await notificationModel.insertMany(docs);
}

// Notifications must never break the order flow that triggered them.
export function safely(promise, label) {
  return promise.catch((err) => console.error(`notification (${label}) failed:`, err.message));
}

export async function notifySellersOfCancellationRequest(order) {
  const [groups, buyer] = await Promise.all([
    itemsBySeller(order),
    userModel.findById(order.userId).select("name"),
  ]);
  const reason = order.cancellationRequest?.reason;
  const docs = [...groups].map(([sellerId, items]) => ({
    userId: sellerId,
    type: "CANCEL_REQUEST",
    title: `Cancellation requested for #${shortId(order._id)}`,
    body: `${buyer?.name ?? "The customer"} wants to cancel ${summarize(items, order.totalPrice.currency)} that has already shipped${
      reason ? `: "${reason}".` : "."
    } Approve to refund, or decline.`,
    orderId: order._id,
  }));
  if (docs.length) await notificationModel.insertMany(docs);
}
