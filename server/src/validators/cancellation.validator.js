import { body, param } from "express-validator";
import { validateRequest } from "../utils/validate.js";

export const requestCancellationValidator = [
  param("orderId").isMongoId().withMessage("Invalid order ID"),
  body("reason")
    .isString()
    .trim()
    .isLength({ min: 3, max: 300 })
    .withMessage("Tell the seller why, in 3 to 300 characters"),
  validateRequest,
];

export const respondCancellationValidator = [
  param("orderId").isMongoId().withMessage("Invalid order ID"),
  body("decision").isIn(["APPROVE", "DECLINE"]).withMessage("Decision must be APPROVE or DECLINE"),
  body("note").optional().isString().trim().isLength({ max: 300 }).withMessage("Keep the note under 300 characters"),
  validateRequest,
];
