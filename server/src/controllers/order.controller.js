import orderModel from "../models/order.model.js";
import cartModel from "../models/cart.model.js";
import productModel from "../models/product.model.js";
import userModel from "../models/user.model.js";

const ORDER_STATUSES = ["PLACED", "SHIPPED", "DELIVERED", "PENDING", "CANCELLED"];

// Atomically decrements stock for one item; only matches if enough stock is left.
function reserveStock({ productId, size, quantity }) {
  return productModel.updateOne(
    { _id: productId, sizes: { $elemMatch: { size, stock: { $gte: quantity } } } },
    { $inc: { "sizes.$.stock": -quantity } }
  );
}

function releaseStock({ productId, size, quantity }) {
  return productModel.updateOne(
    { _id: productId, "sizes.size": size },
    { $inc: { "sizes.$.stock": quantity } }
  );
}

export async function createOrder(req, res) {
  const user = req.user;
  const cart = await cartModel
    .findOne({ userId: user.id })
    .populate("products.productId");
  if (!cart || cart.products.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  if (cart.products.some((p) => !p.productId)) {
    return res.status(400).json({ message: "Cart has products that no longer exist" });
  }

  const publishedProducts = cart.products.filter((p) => p.productId.isPublished);
  if (publishedProducts.length !== cart.products.length) {
    return res.status(400).json({ message: "Cart has unpublished products" });
  }

  const currencies = new Set(cart.products.map((p) => p.productId.price.currency));
  if (currencies.size > 1) {
    return res.status(400).json({ message: "Cart has products in different currencies" });
  }
  const [currency] = currencies;

  const sizeError = [];
  cart.products.forEach((p) => {
    const productSize = p.size;
    const size = p.productId.sizes.find((s) => s.size === productSize);
    if (!size) {
      sizeError.push({ productId: p.productId._id, message: `Size ${productSize} not available` });
      return;
    }
    if (size.stock < p.quantity) {
      sizeError.push({
        productId: p.productId._id,
        message: `Only ${size.stock} available for size: ${productSize}`,
      });
    }
  });
  if (sizeError.length > 0) {
    return res.status(400).json({ message: "Cart has invalid sizes", sizeError });
  }

  // Reserve stock item by item; if another order took the last units in the
  // meantime, give back what we already reserved and reject the order.
  const items = cart.products.map((p) => ({
    productId: p.productId._id,
    size: p.size,
    quantity: p.quantity,
  }));
  const reserved = [];
  for (const item of items) {
    const result = await reserveStock(item);
    if (result.modifiedCount === 0) {
      await Promise.all(reserved.map(releaseStock));
      return res.status(409).json({
        message: "Some items went out of stock, please review your cart",
        sizeError: [{ productId: item.productId, message: `Not enough stock for size: ${item.size}` }],
      });
    }
    reserved.push(item);
  }

  const order = await orderModel.create({
    userId: user.id,
    address: req.body.address,
    products: cart.products.map((p) => ({
      product: {
        title: p.productId.title,
        price: p.productId.price,
        description: p.productId.description,
        image: p.productId.images[0]?.url ?? "",
        productId: p.productId._id,
      },
      size: p.size,
      quantity: p.quantity,
    })),
    totalPrice: {
      amount: cart.products.reduce((acc, p) => acc + p.productId.price.amount * p.quantity, 0),
      currency,
    },
  });

  // clear the cart now that the order is placed
  await cartModel.updateOne({ userId: user.id }, { $set: { products: [] } });

  return res.status(201).json({ message: "Order created successfully", data: { order } });
}

export async function getOrders(req, res) {
  const user = req.user;
  const orders = await orderModel.find({ userId: user.id }).sort({ createdAt: -1 });
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
    .find({ "products.product.productId": { $in: productIds } })
    .sort({ createdAt: -1 })
    .lean();

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
    };
  });

  return res.status(200).json({ message: "Orders fetched successfully", data: { orders: data } });
}

export async function cancelOrder(req, res) {
  const user = req.user;
  const { orderId } = req.params;
  const order = await orderModel.findOne({ _id: orderId });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.userId.toString() !== user.id.toString()) {
    return res.status(403).json({ message: "You are not authorized to cancel this order" });
  }
  if (order.status === "CANCELLED") {
    return res.status(400).json({ message: "Order is already cancelled" });
  }
  if (["DELIVERED", "SHIPPED"].includes(order.status)) {
    return res.status(400).json({ message: `Order cannot be cancelled as it is already ${order.status}` });
  }

  // only the request that actually flips the status restores stock
  const result = await orderModel.updateOne(
    { _id: orderId, status: order.status },
    { $set: { status: "CANCELLED" } }
  );
  if (result.modifiedCount === 0) {
    return res.status(409).json({ message: "Order status changed, please try again" });
  }
  await Promise.all(
    order.products.map((p) =>
      releaseStock({ productId: p.product.productId, size: p.size, quantity: p.quantity })
    )
  );
  return res.status(200).json({ message: "Order cancelled successfully" });
}

export async function updateOrderStatus(req, res) {
  const user = req.user;
  if (user.role !== "seller") {
    return res.status(403).json({ message: "You are not authorized to update order status" });
  }
  const { orderId } = req.params;
  const order = await orderModel.findOne({ _id: orderId });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const productIds = order.products.map((p) => p.product.productId);
  const ownsProduct = await productModel.exists({ _id: { $in: productIds }, seller: user.id });
  if (!ownsProduct) {
    return res.status(403).json({ message: "You can only update orders that contain your products" });
  }

  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  if (order.status === "CANCELLED") {
    return res.status(400).json({ message: "Cancelled orders cannot be updated" });
  }

  const result = await orderModel.updateOne(
    { _id: orderId, status: order.status },
    { $set: { status } }
  );
  if (result.modifiedCount === 0 && order.status !== status) {
    return res.status(409).json({ message: "Order status changed, please try again" });
  }
  if (status === "CANCELLED") {
    await Promise.all(
      order.products.map((p) =>
        releaseStock({ productId: p.product.productId, size: p.size, quantity: p.quantity })
      )
    );
  }
  return res.status(200).json({ message: "Order status updated successfully" });
}
