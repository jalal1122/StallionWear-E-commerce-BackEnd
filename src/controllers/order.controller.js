import Order from "../models/order.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Fucntion to create a new order
export const createOrder = asyncHandler(async (req, res) => {
  // get the order data from the request body
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    shippingCharge,
    totalAmount,
  } = req.body;

  //   get the user id from the middleware
  const userId = req.user._id;

  //   validate the required fields
  if (!orderItems || orderItems.length === 0) {
    throw new ApiError(400, "Order items are required");
  }

  if( !shippingAddress || !shippingAddress.fullName || !shippingAddress.address ||
      !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country ||
      !shippingAddress.phone) {
    throw new ApiError(400, "Shipping Address is required");
  }

  if( !paymentMethod || !["CashOnDelivery", "Stripe", "PayPal"].includes(paymentMethod)) {
    throw new ApiError(400, "Valid payment method is required");
  }

  if( shippingCharge < 0 ) {
    throw new ApiError(400, "Shipping charge cannot be negative");
  }

  if( totalAmount < 0 ) {
    throw new ApiError(400, "Total amount cannot be negative");
  }

  // const finalAmount = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0) + shippingCharge;
});
