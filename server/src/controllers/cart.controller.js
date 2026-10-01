import productModel from "../models/product.model.js";
import cartModel from "../models/cart.model.js";

export async function addToCart(req, res) {
  const { productId } = req.params;
  const { size: productSize, quantity } = req.body;

  const product = await productModel.findById(productId);
  if (!product || !product.isPublished) {
    return res.status(404).json({ message: "Product not found" });
  }

  const size = product.sizes.find((s) => s.size === productSize);
  if (!size) {
    return res.status(400).json({ message: "Size not found" });
  }

  if (quantity > size.stock) {
    return res.status(400).json({ message: "Quantity exceeds stock" });
  }

  const cart = await cartModel.findOneAndUpdate(
    { userId: req.user.id },
    { $setOnInsert: { userId: req.user.id, products: [] } },
    { upsert: true, new: true }
  );

  const productInCart = cart.products.find(
    (p) => productId === p.productId.toString() && p.size === productSize
  );

  if (productInCart) {
    const totalQuantity = productInCart.quantity + quantity;
    if (totalQuantity > size.stock) {
      return res.status(400).json({ message: "Quantity exceeds stock" });
    }
    await cartModel.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          "products.$[elem].quantity": totalQuantity,
        },
      },
      {
        arrayFilters: [{ "elem.productId": productId, "elem.size": productSize }],
      }
    );
  } else {
    await cartModel.findOneAndUpdate(
      { userId: req.user.id },
      {
        $push: {
          products: {
            productId: productId,
            size: productSize,
            quantity: quantity,
          },
        },
      }
    );
  }

  return res.status(200).json({ message: "Product added to cart" });
}

export async function removeProductFromCart(req, res) {
  const { productId } = req.params;
  const { size: productSize, quantity } = req.body;

  const product = await productModel.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product Not Found" });
  }
  const cart = await cartModel.findOne({ userId: req.user.id });
  if (!cart) {
    return res.status(400).json({ message: "Cart is empty" });
  }
  const productInCart = cart.products.find(
    (p) => p.productId.toString() === productId && p.size === productSize
  );
  if (!productInCart) {
    return res.status(404).json({ message: "Product not found in cart" });
  }
  if (productInCart.quantity <= quantity) {
    await cartModel.findOneAndUpdate(
      { userId: req.user.id },
      {
        $pull: {
          products: {
            productId: productId,
            size: productSize,
          },
        },
      }
    );
  } else {
    const newQuantity = productInCart.quantity - quantity;
    await cartModel.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          "products.$[elem].quantity": newQuantity,
        },
      },
      {
        arrayFilters: [{ "elem.productId": productId, "elem.size": productSize }],
      }
    );
  }

  return res.status(200).json({ message: "Product removed Successfully" });
}

export async function getCart(req, res) {
  const user = req.user;
  const cart = await cartModel
    .findOneAndUpdate(
      { userId: user.id },
      { $setOnInsert: { userId: user.id, products: [] } },
      { upsert: true, new: true }
    )
    .populate("products.productId");

  // drop items whose product has since been deleted
  const missing = cart.products.filter((item) => !item.productId);
  if (missing.length > 0) {
    cart.products = cart.products.filter((item) => item.productId);
    await cartModel.updateOne(
      { userId: user.id },
      { $pull: { products: { _id: { $in: missing.map((item) => item._id) } } } }
    );
  }

  const totalPrice = cart.products.reduce((total, item) => {
    return total + item.productId.price.amount * item.quantity;
  }, 0);

  return res.status(200).json({
    message: "Cart data Retrieved",
    data: {
      cart: cart,
      totalPrice: totalPrice,
    },
  });
}