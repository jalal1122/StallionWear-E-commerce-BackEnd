import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { log } from "console";
import { stat } from "fs";

// Function to create a new order
export const createOrder = asyncHandler(async (req, res) => {
  // Authentication is already handled by authMiddleware
  // Both users and admins can create orders

  // get the order data from the request body
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    shippingCharge = 0,
    discount = 0,
    notes,
  } = req.body;

  //   get the user id from the middleware
  const userId = req.user._id;

  //   validate the required fields
  if (!orderItems || orderItems.length === 0) {
    throw new ApiError(400, "Order items are required");
  }

  if (
    !shippingAddress ||
    !shippingAddress.fullName ||
    !shippingAddress.address ||
    !shippingAddress.city ||
    !shippingAddress.postalCode ||
    !shippingAddress.country ||
    !shippingAddress.phone
  ) {
    throw new ApiError(400, "Complete shipping address is required");
  }

  if (
    !paymentMethod ||
    !["CashOnDelivery", "Stripe", "PayPal"].includes(paymentMethod)
  ) {
    throw new ApiError(400, "Valid payment method is required");
  }

  if (shippingCharge < 0) {
    throw new ApiError(400, "Shipping charge cannot be negative");
  }

  if (discount < 0) {
    throw new ApiError(400, "Discount cannot be negative");
  }

  // Validate and process order items
  const processedOrderItems = [];
  let calculatedTotal = 0;

  for (const item of orderItems) {
    // Validate required fields
    if (!item.product || !item.size || !item.color || !item.quantity) {
      throw new ApiError(
        400,
        "Each order item must have product, size, color, and quantity"
      );
    }

    // Get product details
    const product = await Product.findById(item.product);
    if (!product) {
      throw new ApiError(404, `Product with ID ${item.product} not found`);
    }

    // Check if variant exists and has sufficient stock
    if (!product.isInStock(item.size, item.color, item.quantity)) {
      throw new ApiError(
        400,
        `Insufficient stock for ${product.name} (${item.size}, ${item.color})`
      );
    }

    // Get the current price (including any variant modifiers)
    const currentPrice = product.getFinalPrice(item.size, item.color);
    const subtotal = currentPrice * item.quantity;

    // Process the order item
    const processedItem = {
      product: product._id,
      productName: product.name, // Store product name for historical reference
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: currentPrice,
      subtotal: subtotal,
    };

    processedOrderItems.push(processedItem);
    calculatedTotal += subtotal;
  }

  // Calculate final amount
  const finalAmount = calculatedTotal + shippingCharge - discount;

  if (finalAmount <= 0) {
    throw new ApiError(400, "Final order amount must be greater than 0");
  }

  // Create the order
  const newOrder = await Order.create({
    user: userId,
    orderItems: processedOrderItems,
    shippingAddress,
    paymentMethod,
    shippingCharge,
    totalAmount: calculatedTotal,
    finalAmount,
    discount,
    notes: notes || "",
  });

  // Update product stock for each variant
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    await product.updateVariantStock(item.size, item.color, item.quantity);
  }

  // Clear user's cart (optional - you might want to do this after payment confirmation)
  await User.findByIdAndUpdate(userId, { $set: { cart: [] } });

  // Populate the order with product and user details
  const populatedOrder = await Order.findById(newOrder._id)
    .populate("user", "name email")
    .populate("orderItems.product", "name images brand category");

  res
    .status(201)
    .json(new ApiResponse(201, "Order created successfully", populatedOrder));
});

// Function to get all orders for the authenticated user
export const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 5, status } = req.query;

  // Build query
  let query = { user: userId };
  if (status) {
    query.orderStatus = status;
  }

  // Execute query with pagination
  const orders = await Order.find(query)
    .populate("orderItems.product", "name images brand")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const totalOrders = await Order.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, "Orders retrieved successfully", {
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
    })
  );
});

// Function to get a specific order by ID
export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Build query - users can only see their own orders, admins can see all
  let query = { _id: orderId };
  if (userRole !== "admin") {
    query.user = userId;
  }

  const order = await Order.findOne(query)
    .populate("user", "name email phone")
    .populate("orderItems.product", "name images brand category");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Order retrieved successfully", order));
});

// Function to cancel an order (user can cancel their own orders)
export const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Build query - users can only cancel their own orders, admins can cancel any
  let query = { _id: orderId };
  if (userRole !== "admin") {
    query.user = userId;
  }

  const order = await Order.findOne(query);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Use the model method to cancel the order
  try {
    await order.cancel();

    // Restore product stock for each variant
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        const variant = product.getVariant(item.size, item.color);
        if (variant) {
          variant.quantity += item.quantity;
          await product.save();
        }
      }
    }

    res
      .status(200)
      .json(new ApiResponse(200, "Order cancelled successfully", order));
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

// Admin function to update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus, paymentStatus, trackingNumber } = req.body;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Access denied. Admin role required.");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Update order status using model method
  if (orderStatus) {
    try {
      await order.updateStatus(orderStatus, trackingNumber);
    } catch (error) {
      throw new ApiError(400, error.message);
    }
  }

  // Update payment status
  if (
    paymentStatus &&
    ["Pending", "Paid", "Failed", "Refunded"].includes(paymentStatus)
  ) {
    order.paymentStatus = paymentStatus;
    await order.save();
  }

  // Populate updated order
  const updatedOrder = await Order.findById(orderId)
    .populate("user", "name email")
    .populate("orderItems.product", "name images brand");

  res
    .status(200)
    .json(
      new ApiResponse(200, "Order status updated successfully", updatedOrder)
    );
});

// Admin function to get all orders with filtering and pagination
export const getAllOrders = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Access denied. Admin role required.");
  }

  const {
    page = 1,
    limit = 10,
    orderStatus,
    paymentStatus,
    paymentMethod,
    startDate,
    endDate,
  } = req.query;

  // Build query
  let query = {};

  if (orderStatus) {
    query.orderStatus = orderStatus;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  if (paymentMethod) {
    query.paymentMethod = paymentMethod;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Execute query with pagination
  const orders = await Order.find(query)
    .populate("user", "name email")
    .populate("orderItems.product", "name brand")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const totalOrders = await Order.countDocuments(query);

  // Calculate summary statistics
  const orderStats = await Order.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$finalAmount" },
        averageOrderValue: { $avg: "$finalAmount" },
        totalOrders: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json(
    new ApiResponse(200, "Orders retrieved successfully", {
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      stats: orderStats[0] || {
        totalRevenue: 0,
        averageOrderValue: 0,
        totalOrders: 0,
      },
    })
  );
});

// Function to get order analytics (admin only)
export const getOrderAnalytics = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Access denied. Admin role required.");
  }

  const { period = "30" } = req.query; // Default to last 30 days
  const daysBack = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // Orders analytics
  const analytics = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          status: "$orderStatus",
        },
        count: { $sum: 1 },
        revenue: { $sum: "$finalAmount" },
      },
    },
    {
      $sort: { "_id.date": 1 },
    },
  ]);

  // Top selling products
  const topProducts = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        orderStatus: { $nin: ["Cancelled"] },
      },
    },
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.product",
        productName: { $first: "$orderItems.productName" },
        totalQuantity: { $sum: "$orderItems.quantity" },
        totalRevenue: { $sum: "$orderItems.subtotal" },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 },
  ]);

  res.status(200).json(
    new ApiResponse(200, "Order analytics retrieved successfully", {
      period: `${daysBack} days`,
      analytics,
      topProducts,
    })
  );
});
