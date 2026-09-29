import { body, param } from "express-validator";
import { validateRequest } from "../utils/validate.js";

export const verifyPaymentValidator = [
  body("orderId").isMongoId().withMessage("Invalid order ID"),
  body("razorpay_order_id").isString().notEmpty().withMessage("Missing Razorpay order ID"),
  body("razorpay_payment_id").isString().notEmpty().withMessage("Missing Razorpay payment ID"),
  body("razorpay_signature").isString().notEmpty().withMessage("Missing Razorpay signature"),
  validateRequest,
];

export const abandonCheckoutValidator = [
  param("orderId").isMongoId().withMessage("Invalid order ID"),
  validateRequest,
];
