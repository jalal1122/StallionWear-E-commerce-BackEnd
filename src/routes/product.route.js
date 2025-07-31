import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { uploadMultiple } from "../middlewares/multer.middleware.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const productRouter = express.Router();

// Public routes
// Get all products
productRouter.get("/", getAllProducts);

// Get product by ID
productRouter.get("/:id", getProductById);

// Protected routes (require authentication)

// Create product
productRouter.post(
  "/create",
  authMiddleware,
  uploadMultiple, // This handles req.files (array of files)
  createProduct
);

// Update product
productRouter.put(
  "/update/:id",
  authMiddleware,
  uploadMultiple, // This handles req.files (array of files)
  updateProduct
);

// Delete product
productRouter.delete("/:id", authMiddleware, deleteProduct);

export default productRouter;
