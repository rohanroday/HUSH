import crypto from "crypto";
import Razorpay from "razorpay";
import config from "../config/config.js";

const client = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

// Razorpay takes amounts in the smallest currency unit (paise / cents).
export function toSubunits(amount) {
  return Math.round(amount * 100);
}

export function createRazorpayOrder({ amount, currency, receipt, notes }) {
  return client.orders.create({
    amount: toSubunits(amount),
    currency,
    receipt,
    notes,
  });
}

// Checks the signature Razorpay Checkout hands back after a payment:
// HMAC-SHA256 of "<order_id>|<payment_id>" keyed with the secret.
export function isValidPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  if (!razorpayOrderId || !razorpayPaymentId || typeof signature !== "string") return false;
  const expected = crypto
    .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function fetchPayment(paymentId) {
  return client.payments.fetch(paymentId);
}

// All payment attempts made against a Razorpay order (a buyer can retry
// inside the checkout modal, so there may be several failed ones).
export async function fetchOrderPayments(razorpayOrderId) {
  const res = await client.orders.fetchPayments(razorpayOrderId);
  return res.items || [];
}

// Authorized payments are only held; capture them so the money actually moves.
export async function ensureCaptured(payment) {
  if (payment.status === "authorized") {
    return client.payments.capture(payment.id, payment.amount, payment.currency);
  }
  return payment;
}

export function refundPayment(paymentId, amount, notes) {
  return client.payments.refund(paymentId, {
    amount: toSubunits(amount),
    speed: "normal",
    notes,
  });
}

// Razorpay's own error objects keep the useful text in error.description.
export function describeRazorpayError(err) {
  return err?.error?.description || err?.message || "Payment provider error";
}

export function fetchRefund(refundId) {
  return client.refunds.fetch(refundId);
}
