import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";

// Get orders that are delivered and available for review
export const getOrdersToReview = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  console.log("getting orders to reviews");

  // Get delivered orders for this user
  const orders = await Order.find({
    user: userId,
    orderStatus: "Delivered",
    isDelivered: true,
  })
    .populate("orderItems.product", "name images brand category reviews")
    .sort({ deliveredAt: -1 });

  // If no delivered orders found
  if (!orders || orders.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, "No delivered orders found", {
        orders: [],
        reviewableProducts: [],
        totalOrders: 0,
      })
    );
  }

  // Process orders to identify reviewable products
  const reviewableProducts = [];

  orders.forEach((order) => {
    order.orderItems.forEach((item) => {
      // Check if this user has already reviewed this product
      const existingReview = item.product.reviews.find(
        (review) => review.user.toString() === userId.toString()
      );

      // If no existing review, add to reviewable list
      if (!existingReview) {
        reviewableProducts.push({
          orderId: order._id,
          orderDate: order.createdAt,
          deliveredAt: order.deliveredAt,
          product: {
            _id: item.product._id,
            name: item.product.name,
            images: item.product.images,
            brand: item.product.brand,
            category: item.product.category,
          },
          variant: {
            size: item.size,
            color: item.color,
          },
          quantity: item.quantity,
          price: item.price,
          productName: item.productName, // Historical name at time of purchase
        });
      }
    });
  });

  // Send response
  res.status(200).json(
    new ApiResponse(200, "Orders to review retrieved successfully", {
      orders: orders.map((order) => ({
        _id: order._id,
        orderDate: order.createdAt,
        deliveredAt: order.deliveredAt,
        totalAmount: order.finalAmount,
        itemCount: order.orderItems.length,
        hasReviewableItems: order.orderItems.some(
          (item) =>
            !item.product.reviews.find(
              (review) => review.user.toString() === userId.toString()
            )
        ),
      })),
      reviewableProducts,
      totalOrders: orders.length,
      totalReviewableProducts: reviewableProducts.length,
    })
  );
});

// Add review for a product
export const addReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, comment } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!productId || !orderId || !rating || !comment) {
    throw new ApiError(
      400,
      "Product ID, Order ID, rating, and comment are required"
    );
  }

  // Validate rating
  if (rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  // Validate comment length
  if (comment.length < 10) {
    throw new ApiError(400, "Comment must be at least 10 characters long");
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if order exists and belongs to user
  const order = await Order.findOne({
    _id: orderId,
    user: userId,
    orderStatus: "Delivered",
    isDelivered: true,
  });

  if (!order) {
    throw new ApiError(404, "Order not found or not eligible for review");
  }

  // Check if user actually purchased this product in this order
  const orderItem = order.orderItems.find(
    (item) => item.product.toString() === productId.toString()
  );

  if (!orderItem) {
    throw new ApiError(400, "Product was not purchased in this order");
  }

  // Check if user has already reviewed this product
  const existingReview = product.reviews.find(
    (review) => review.user.toString() === userId.toString()
  );

  if (existingReview) {
    throw new ApiError(400, "You have already reviewed this product");
  }

  try {
    // Add review to product
    product.reviews.push({
      user: userId,
      rating: parseInt(rating),
      comment: comment.trim(),
      createdAt: new Date(),
    });

    await product.save();

    // Get updated product with populated reviews
    const updatedProduct = await Product.findById(productId)
      .populate("reviews.user", "name profilePicture")
      .select("name averageRating reviews");

    // Send response
    res.status(201).json(
      new ApiResponse(201, "Review added successfully", {
        product: {
          _id: updatedProduct._id,
          name: updatedProduct.name,
          averageRating: updatedProduct.averageRating,
          totalReviews: updatedProduct.reviews.length,
        },
        addedReview: {
          user: {
            _id: userId,
            name: req.user.name,
            profilePicture: req.user.profilePicture,
          },
          rating: parseInt(rating),
          comment: comment.trim(),
          createdAt: new Date(),
        },
      })
    );
  } catch (error) {
    console.error("Failed to add review:", error);
    throw new ApiError(500, `Failed to add review: ${error.message}`);
  }
});

// Get reviews for a specific product
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, rating } = req.query;

  // Validate product ID
  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Build filter for reviews
  let reviewFilter = {};
  if (rating && rating >= 1 && rating <= 5) {
    reviewFilter.rating = parseInt(rating);
  }

  // Get reviews with pagination
  let reviews = product.reviews.filter((review) => {
    if (rating && review.rating !== parseInt(rating)) {
      return false;
    }
    return true;
  });

  // Sort by newest first
  reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedReviews = reviews.slice(startIndex, endIndex);

  // Populate user details for paginated reviews
  await Product.populate(product, {
    path: "reviews.user",
    select: "name profilePicture",
    match: { _id: { $in: paginatedReviews.map((r) => r.user) } },
  });

  // Calculate rating distribution
  const ratingDistribution = {
    1: reviews.filter((r) => r.rating === 1).length,
    2: reviews.filter((r) => r.rating === 2).length,
    3: reviews.filter((r) => r.rating === 3).length,
    4: reviews.filter((r) => r.rating === 4).length,
    5: reviews.filter((r) => r.rating === 5).length,
  };

  // Send response
  res.status(200).json(
    new ApiResponse(200, "Product reviews retrieved successfully", {
      product: {
        _id: product._id,
        name: product.name,
        averageRating: product.averageRating,
        totalReviews: reviews.length,
      },
      reviews: paginatedReviews.map((review) => ({
        _id: review._id,
        user: product.reviews.find(
          (r) => r._id.toString() === review._id.toString()
        )?.user || {
          name: "Anonymous",
          profilePicture: null,
        },
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(reviews.length / limit),
        totalReviews: reviews.length,
        hasNextPage: endIndex < reviews.length,
        hasPrevPage: startIndex > 0,
      },
      ratingDistribution,
    })
  );
});

// Delete review (user can only delete their own review)
export const deleteReview = asyncHandler(async (req, res) => {
  const { productId, reviewId } = req.params;
  const userId = req.user._id;

  // Validate required parameters
  if (!productId || !reviewId) {
    throw new ApiError(400, "Product ID and Review ID are required");
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Find the review
  const reviewIndex = product.reviews.findIndex(
    (review) =>
      review._id.toString() === reviewId.toString() &&
      review.user.toString() === userId.toString()
  );

  if (reviewIndex === -1) {
    throw new ApiError(
      404,
      "Review not found or you don't have permission to delete it"
    );
  }

  try {
    // Remove the review
    const deletedReview = product.reviews[reviewIndex];
    product.reviews.splice(reviewIndex, 1);

    await product.save();

    // Send response
    res.status(200).json(
      new ApiResponse(200, "Review deleted successfully", {
        product: {
          _id: product._id,
          name: product.name,
          averageRating: product.averageRating,
          totalReviews: product.reviews.length,
        },
        deletedReview: {
          _id: deletedReview._id,
          rating: deletedReview.rating,
          comment: deletedReview.comment,
        },
      })
    );
  } catch (error) {
    console.error("Failed to delete review:", error);
    throw new ApiError(500, `Failed to delete review: ${error.message}`);
  }
});
