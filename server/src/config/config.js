import dotenv from 'dotenv';
dotenv.config();

const config = {
  MONGODB_URI: process.env.MONGODB_URI,
  IMAGEKIT_API_KEY: process.env.IMAGEKIT_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID?.trim(),
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET?.trim(),
  // flat standard shipping charged on every order, in the order's currency
  SHIPPING_FEE: 99,
  // unpaid checkouts hold stock for this long before it is released
  PAYMENT_HOLD_MINUTES: 20,
};

export default config;
