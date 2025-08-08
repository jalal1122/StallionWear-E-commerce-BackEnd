import asyncHandler from "../utils/asyncHandler.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Add product to wishlist
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user._id; // Get user ID from authenticated user

  // Validate request
  if (!productId) {
    throw new ApiError("Product ID is required", 400);
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  // Add product to user's wishlist
  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { wishlist: productId } },
    { new: true }
  ).populate("wishlist");

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Send response
  res
    .status(200)
    .json(
      new ApiResponse("Product added to wishlist", { wishlist: user.wishlist })
    );
});

// Remove product from wishlist
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user._id; // Get user ID from authenticated user

  // Validate request
  if (!productId) {
    throw new ApiError("Product ID is required", 400);
  }

  // Remove product from user's wishlist
  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { wishlist: productId } },
    { new: true }
  ).populate("wishlist");

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Send response
  res.status(200).json(
    new ApiResponse("Product removed from wishlist", {
      wishlist: user.wishlist,
    })
  );
});

// Get user's wishlist
export const getWishlist = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Get user ID from authenticated user

  // Find user's wishlist
  const user = await User.findById(userId).populate("wishlist");

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Send response
  res.status(200).json(
    new ApiResponse("Wishlist retrieved successfully", {
      wishlist: user.wishlist,
    })
  );
});

// Clear user's wishlist
export const clearWishlist = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Get user ID from authenticated user

  // Clear user's wishlist
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { wishlist: [] } },
    { new: true }
  ).populate("wishlist");

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Send response
  res.status(200).json(
    new ApiResponse("Wishlist cleared successfully", {
      wishlist: user.wishlist,
    })
  );
});
