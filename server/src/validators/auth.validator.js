import { body } from "express-validator";
import { validateRequest } from "../utils/validate.js";

// Passwords are not trimmed: spaces are legitimate characters in a password.
export const registerValidator = [
  body("name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3, max: 40 })
    .withMessage("Name must be between 3 and 40 characters"),
  body("email")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .toLowerCase(),
  body("password")
    .isString()
    .withMessage("Password is required")
    .isLength({ min: 6, max: 72 })
    .withMessage("Password must be between 6 and 72 characters long"),
    validateRequest
];

export const loginValidator = [
  body("email")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .toLowerCase(),
  body("password")
    .isString()
    .notEmpty()
    .withMessage("Password is required"),
    validateRequest
];

export const changePasswordValidator = [
  body("currentPassword").isString().notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isString()
    .isLength({ min: 6, max: 72 })
    .withMessage("New password must be between 6 and 72 characters long"),
  validateRequest,
];
