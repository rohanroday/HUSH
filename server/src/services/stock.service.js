import productModel from "../models/product.model.js";

// Atomically decrements stock for one item; only matches if enough stock is left.
export function reserveStock({ productId, size, quantity }) {
  return productModel.updateOne(
    { _id: productId, sizes: { $elemMatch: { size, stock: { $gte: quantity } } } },
    { $inc: { "sizes.$.stock": -quantity } }
  );
}

export function releaseStock({ productId, size, quantity }) {
  return productModel.updateOne(
    { _id: productId, "sizes.size": size },
    { $inc: { "sizes.$.stock": quantity } }
  );
}

// Reserves every item or none: if one item runs out, the ones already taken
// are given back. Returns the item that failed, or null on success.
export async function reserveAll(items) {
  const reserved = [];
  for (const item of items) {
    const result = await reserveStock(item);
    if (result.modifiedCount === 0) {
      await Promise.all(reserved.map(releaseStock));
      return item;
    }
    reserved.push(item);
  }
  return null;
}

export function releaseOrderStock(order) {
  return Promise.all(
    order.products.map((p) =>
      releaseStock({ productId: p.product.productId, size: p.size, quantity: p.quantity })
    )
  );
}
