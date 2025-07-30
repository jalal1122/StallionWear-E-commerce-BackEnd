import express from "express";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderAnalytics,
} from "../controllers/order.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateOrderCreation } from "../middlewares/validation.middleware.js";

const orderRouter = express.Router();

// All routes require authentication
orderRouter.use(authMiddleware);

// @desc Create a new order
// @route POST /api/order
// @access Private
orderRouter.post("/", validateOrderCreation, createOrder);

// @desc Get current user's orders
// @route GET /api/order/my-orders
// @access Private
orderRouter.get("/my-orders", getUserOrders);

// @desc Get specific order by ID
// @route GET /api/order/:orderId
// @access Private (own orders) / Admin (all orders)
orderRouter.get("/:orderId", getOrderById);

// @desc Cancel an order
// @route PATCH /api/order/:orderId/cancel
// @access Private (own orders) / Admin (all orders)
orderRouter.patch("/:orderId/cancel", cancelOrder);

// @desc Update order status (Admin only)
// @route PATCH /api/order/:orderId/status
// @access Admin
orderRouter.patch("/:orderId/status", updateOrderStatus);

// @desc Get all orders with filtering (Admin only)
// @route GET /api/order/admin/all
// @access Admin
orderRouter.get("/admin/all", getAllOrders);

// @desc Get order analytics (Admin only)
// @route GET /api/order/admin/analytics
// @access Admin
orderRouter.get("/admin/analytics", getOrderAnalytics);

export default orderRouter;
