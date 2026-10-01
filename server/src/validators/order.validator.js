import { body } from "express-validator";
import { validateRequest } from "../utils/validate.js";

const text = (field, label, max = 100) =>
  body(`address.${field}`)
    .isString()
    .withMessage(`${label} is required`)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .isLength({ max })
    .withMessage(`${label} must be at most ${max} characters`);

export const createOrderValidator = [
  text("house", "House / flat no."),
  text("street", "Street", 150),
  text("city", "City", 60),
  text("state", "State", 60),
  body("address.zip")
    .isString()
    .trim()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage("Enter a valid 6-digit PIN code"),
  body("address.phone")
    .isString()
    .withMessage("Phone number is required")
    .customSanitizer((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|0)/, ""))
    .matches(/^[6-9][0-9]{9}$/)
    .withMessage("Enter a valid 10-digit mobile number"),
  validateRequest,
];
