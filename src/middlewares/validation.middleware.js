import { body, validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

// Validation middleware to check for validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    console.log("Validation errors:", errorMessages);
    throw new ApiError(400, errorMessages.join(", "));
  }
  next();
};

// User registration validation rules
export const validateUserRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name should only contain letters and spaces"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/)
    .withMessage(
      "Password must contain at least one letter, one number, and one special character"
    ),

  body("phone")
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Please provide a valid phone number"),

  body("role")
    .optional()
    .isIn(["user", "admin"])
    .withMessage("Role must be either user or admin"),

  handleValidationErrors,
];

// User login validation rules
export const validateUserLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("password").notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

// Order creation validation rules
export const validateOrderCreation = [
  body("orderItems")
    .isArray({ min: 1 })
    .withMessage("Order must contain at least one item"),

  body("orderItems.*.product._id")
    .isMongoId()
    .withMessage("Each order item must have a valid product ID"),

  body("orderItems.*.size")
    .notEmpty()
    .trim()
    .withMessage("Size is required for each order item"),

  body("orderItems.*.color")
    .notEmpty()
    .trim()
    .withMessage("Color is required for each order item"),

  body("orderItems.*.quantity")
    .isInt({ min: 1, max: 99 })
    .withMessage("Quantity must be between 1 and 99"),

  body("shippingAddress.fullName")
    .notEmpty()
    .trim()
    .withMessage("Full name is required in shipping address"),

  body("shippingAddress.address")
    .notEmpty()
    .trim()
    .withMessage("Address is required in shipping address"),

  body("shippingAddress.city")
    .notEmpty()
    .trim()
    .withMessage("City is required in shipping address"),

  body("shippingAddress.postalCode")
    .notEmpty()
    .trim()
    .withMessage("Postal code is required in shipping address"),

  body("shippingAddress.country")
    .notEmpty()
    .trim()
    .withMessage("Country is required in shipping address"),

  body("shippingAddress.phone")
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Please provide a valid phone number in shipping address"),

  body("paymentMethod")
    .isIn(["CashOnDelivery", "Stripe", "PayPal"])
    .withMessage("Payment method must be CashOnDelivery, Stripe, or PayPal"),

  body("shippingCharge")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Shipping charge must be a positive number"),

  body("discount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount must be a positive number"),

  body("notes")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),

  handleValidationErrors,
];

export default {
  validateUserRegistration,
  validateUserLogin,
  validateOrderCreation,
  handleValidationErrors,
};
