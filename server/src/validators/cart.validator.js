import { body, param } from "express-validator";
import { validateRequest } from "../utils/validate.js";

export const addToCartValidator = [
  param("productId").isMongoId().withMessage("Invalid Product ID"),
  body("size")
    .notEmpty()
    .withMessage("Size is required")
    .isIn(["XS", "S", "M", "L", "XL", "XXL"])
    .withMessage("Invalid Size"),
  body("quantity").notEmpty().withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be greater than 0")
    .toInt(),
    validateRequest
];


export const removeCartValidator = addToCartValidator;
