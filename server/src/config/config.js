import dotenv from 'dotenv';
dotenv.config();

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  MONGODB_URI: process.env.MONGODB_URI,
  IMAGEKIT_API_KEY: process.env.IMAGEKIT_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID?.trim(),
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET?.trim(),
  // comma-separated list of frontend origins allowed to call the API when the
  // client is hosted on a different domain (e.g. https://hush.vercel.app)
  CLIENT_URL: process.env.CLIENT_URL || '',
  // how many reverse proxies sit in front of the app, so req.ip is the real
  // visitor (rate limits depend on it). Render routes Cloudflare -> load
  // balancer -> app; most other hosts have a single proxy.
  TRUST_PROXY: Number(process.env.TRUST_PROXY) || (process.env.RENDER ? 3 : 1),
  // flat standard shipping charged on every order, in the order's currency
  SHIPPING_FEE: 99,
  // longest an unpaid checkout can hold stock (it is released sooner when the
  // payment fails or the buyer closes the payment window or leaves the page)
  PAYMENT_HOLD_MINUTES: 10,
};

// The server can't do anything useful without these; fail loudly at boot
// instead of on the first request.
export function assertRequiredConfig() {
  const missing = ['MONGODB_URI', 'JWT_SECRET', 'IMAGEKIT_API_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].filter(
    (key) => !config[key]
  );
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (config.NODE_ENV === 'production' && config.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

export default config;
