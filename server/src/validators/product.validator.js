import { body } from "express-validator";
import { validateRequest } from "../utils/validate.js";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

// Shipping and checkout are charged in rupees, so products are INR-only.
const CURRENCIES = ["INR"];

function uniqueSizes(sizes) {
  const names = sizes.map((s) => s?.size);
  if (new Set(names).size !== names.length) {
    throw new Error("Each size can only be listed once");
  }
  return true;
}

export const createProductValidator = [
  body("title")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 60 })
    .withMessage("Title must be between 3 and 60 characters"),
  body("description")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 200 })
    .withMessage("Description must be between 10 and 200 characters"),
  body("price.amount")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 1, max: 1000000 })
    .withMessage("Price must be a number between 1 and 10,00,000")
    .toFloat(),
  body("price.currency")
    .default("INR")
    .isIn(CURRENCIES)
    .withMessage("Currency must be INR"),
  body("category")
    .isArray({ min: 1, max: 10 })
    .withMessage("Add between 1 and 10 categories"),
  body("category.*")
    .isString()
    .withMessage("Category must be a string")
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage("Each category must be between 2 and 20 characters"),
  body("sizes")
    .isArray({ min: 1, max: SIZES.length })
    .withMessage("Add at least one size")
    .custom(uniqueSizes),
  body("sizes.*.size")
    .isIn(SIZES)
    .withMessage("Size must be one of XS, S, M, L, XL, XXL"),
  body("sizes.*.stock")
    .isInt({ min: 0, max: 100000 })
    .withMessage("Stock must be a whole number of 0 or more")
    .toInt(),
  validateRequest,
];

export const updateProductValidator = [
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 60 })
    .withMessage("Title must be between 3 and 60 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage("Description must be between 10 and 200 characters"),
  body("price")
    .optional()
    .isObject()
    .withMessage("Invalid price"),
  body("price.amount")
    .if(body("price").exists())
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 1, max: 1000000 })
    .withMessage("Price must be a number between 1 and 10,00,000")
    .toFloat(),
  body("price.currency")
    .if(body("price").exists())
    .default("INR")
    .isIn(CURRENCIES)
    .withMessage("Currency must be INR"),
  body("category")
    .optional()
    .isArray({ min: 1, max: 10 })
    .withMessage("Add between 1 and 10 categories"),
  body("category.*")
    .isString()
    .withMessage("Category must be a string")
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage("Each category must be between 2 and 20 characters"),
  body("sizes")
    .optional()
    .isArray({ min: 1, max: SIZES.length })
    .withMessage("Add at least one size")
    .custom(uniqueSizes),
  body("sizes.*.size")
    .isIn(SIZES)
    .withMessage("Size must be one of XS, S, M, L, XL, XXL"),
  body("sizes.*.stock")
    .isInt({ min: 0, max: 100000 })
    .withMessage("Stock must be a whole number of 0 or more")
    .toInt(),
  validateRequest,
];
