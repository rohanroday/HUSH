import { body } from "express-validator";
import { validateRequest } from "../utils/validate.js";

export const contactValidator = [
  body("name").isString().trim().isLength({ min: 2, max: 60 }).withMessage("Name must be between 2 and 60 characters"),
  body("email").isString().trim().isEmail().withMessage("Enter a valid email address").toLowerCase(),
  body("orderNumber").optional({ values: "falsy" }).isString().trim().isLength({ max: 24 }).withMessage("Order number is too long"),
  body("message").isString().trim().isLength({ min: 5, max: 2000 }).withMessage("Message must be between 5 and 2000 characters"),
  validateRequest,
];
