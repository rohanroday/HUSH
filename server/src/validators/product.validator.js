import { body } from "express-validator";
import { validateRequest } from "../utils/validate.js";

export const createProductValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 60 })
    .withMessage("Title must be between 3 and 60 characters"),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage("Description must be between 10 and 200 characters"),
  body("price.amount")
    .isFloat({ min: 0 })
    .withMessage("Price must be a number")
    .notEmpty()
    .withMessage("Price is required"),
  body("price.currency")
    .isIn(["USD", "INR"])
    .withMessage("Currency must be USD or INR")
    .notEmpty()
    .withMessage("Currency is required"),
  body("category").isArray().withMessage("Category must be an array"),
  body("category.*")
    .trim()
    .isString()
    .withMessage("Category must be a string")
    .notEmpty()
    .withMessage("Category is required"),
  body("sizes").isArray().withMessage("Size must be an array"),
  body("sizes.*.size")
    .trim()
    .isString()
    .withMessage("Size must be a string")
    .notEmpty()
    .withMessage("Size is required")
    .isIn(["XS", "S", "M", "L", "XL", "XXL"])
    .withMessage("Size must be one of XS, S, M, L, XL, XXL"),
  body("sizes.*.stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be an integer")
    .notEmpty()
    .withMessage("Stock is required"),
  validateRequest,
];

export const updateProductValidator = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 60 })
    .withMessage("Title must be between 3 and 60 characters"),
  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage("Description must be between 10 and 200 characters"),
    body("price").optional(),
  body("price.amount")
    .optional()
    .trim()
    .isFloat({ min: 0 })
    .withMessage("Price must be a number")
    .notEmpty()
    .withMessage("Price is required"),
  body("price.currency")
    .optional()
    .trim()
    .isIn(["USD", "INR"])
    .withMessage("Currency must be USD or INR")
    .notEmpty()
    .withMessage("Currency is required"),
  body("category")
    .optional()
    .isArray()
    .withMessage("Category must be an array"),
  body("category.*")
    .optional()
    .trim()
    .trim()
    .isString()
    .withMessage("Category must be a string")
    .notEmpty()
    .withMessage("Category is required"),
  body("sizes").optional().isArray().withMessage("Size must be an array"),
  body("sizes.*.size")
    .optional()
    .trim()
    .trim()
    .isString()
    .withMessage("Size must be a string")
    .notEmpty()
    .withMessage("Size is required")
    .isIn(["XS", "S", "M", "L", "XL", "XXL"])
    .withMessage("Size must be one of XS, S, M, L, XL, XXL"),
  body("sizes.*.stock")
    .optional()
    .trim()
    .isInt({ min: 0 })
    .withMessage("Stock must be an integer")
    .notEmpty()
    .withMessage("Stock is required"),
  validateRequest,
];
