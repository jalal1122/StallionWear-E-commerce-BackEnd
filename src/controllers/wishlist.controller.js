import asyncHandler from "../utils/asyncHandler.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Add product to wishlist
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId, size, color } = req.body;

  // Validate request data
  if (!productId || !size || !color) {
    throw new ApiError(400, "Product ID, size, and color are required");
  }

  // Validate user authentication
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const user = req.user;

  // Check if product exists and get current price
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Validate if the size/color variant exists
  const variant = product.getVariant ? product.getVariant(size, color) : null;
  if (!variant) {
    throw new ApiError(
      400,
      `Product variant (Size: ${size}, Color: ${color}) does not exist`
    );
  }

  // Get current price for this variant
  const currentPrice = product.getFinalPrice
    ? product.getFinalPrice(size, color)
    : product.price;

  try {
    // Add item to user's wishlist using the schema method
    await user.addToWishlist(productId, size, color, currentPrice);

    // Get updated wishlist with populated product details
    await user.populate({
      path: "wishlist.product",
      select: "name images brand category price",
    });

    // Send response with detailed wishlist information
    res.status(201).json(
      new ApiResponse(201, "Product added to wishlist successfully", {
        wishlist: user.wishlist,
        wishlistSummary: {
          totalItems: user.getWishlistCount
            ? user.getWishlistCount()
            : user.wishlist.length,
          estimatedValue: user.getWishlistEstimatedValue
            ? user.getWishlistEstimatedValue()
            : 0,
          currency: "USD",
        },
        addedItem: {
          productId,
          productName: product.name,
          size,
          color,
          priceAtTime: currentPrice,
        },
      })
    );
  } catch (error) {
    console.error("Wishlist operation failed:", error);
    throw new ApiError(500, `Failed to add item to wishlist: ${error.message}`);
  }
});

// Remove product from wishlist
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId, size, color } = req.body;

  // Validate request data
  if (!productId || !size || !color) {
    throw new ApiError(400, "Product ID, size, and color are required");
  }

  // Validate user authentication
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const user = req.user;

  // Validate that wishlist exists and has items
  if (!user.wishlist || user.wishlist.length === 0) {
    throw new ApiError(400, "Wishlist is empty");
  }

  // Check if item exists in wishlist
  const itemExists = user.wishlist.some(
    (item) =>
      item.product.toString() === productId.toString() &&
      item.size === size &&
      item.color === color
  );

  if (!itemExists) {
    throw new ApiError(404, "Item not found in wishlist");
  }

  try {
    // Remove item from user's wishlist using the schema method
    await user.removeFromWishlist(productId, size, color);

    // Get updated wishlist with populated product details
    if (user.wishlist.length > 0) {
      await user.populate({
        path: "wishlist.product",
        select: "name images brand category price",
      });
    }

    // Send response with updated wishlist information
    res.status(200).json(
      new ApiResponse(200, "Product removed from wishlist successfully", {
        wishlist: user.wishlist,
        wishlistSummary: {
          totalItems: user.getWishlistCount
            ? user.getWishlistCount()
            : user.wishlist.length,
          estimatedValue: user.getWishlistEstimatedValue
            ? user.getWishlistEstimatedValue()
            : 0,
          currency: "USD",
        },
        removedItem: {
          productId,
          size,
          color,
        },
        wishlistStatus: user.wishlist.length === 0 ? "empty" : "has_items",
      })
    );
  } catch (error) {
    console.error("Wishlist removal failed:", error);
    throw new ApiError(
      500,
      `Failed to remove item from wishlist: ${error.message}`
    );
  }
});

// Get user's wishlist
export const getWishlist = asyncHandler(async (req, res) => {
  const user = req.user;

  // Validate user authentication
  if (!user) {
    throw new ApiError(401, "User not authenticated");
  }

  // Check if wishlist exists and has items
  if (!user.wishlist || user.wishlist.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, "Wishlist is empty", {
        wishlist: [],
        wishlistSummary: {
          totalItems: 0,
          estimatedValue: 0,
          currency: "USD",
        },
        recommendations: {
          message:
            "Your wishlist is empty. Browse our collection to add items!",
          suggestedAction: "explore_products",
        },
      })
    );
  }

  try {
    // Populate product details in wishlist items
    await user.populate({
      path: "wishlist.product",
      select:
        "name description price images brand category stock variants averageRating",
    });

    // Filter out any wishlist items where product was deleted
    const validWishlistItems = user.wishlist.filter(
      (item) => item.product && item.product._id
    );

    // If any items were removed due to deleted products, update user wishlist
    if (validWishlistItems.length !== user.wishlist.length) {
      user.wishlist = validWishlistItems;
      await user.save({ validateBeforeSave: false });
    }

    // Calculate totals
    const totalItems = user.getWishlistCount
      ? user.getWishlistCount()
      : validWishlistItems.length;
    const estimatedValue = user.getWishlistEstimatedValue
      ? user.getWishlistEstimatedValue()
      : 0;

    // Prepare enhanced response
    const responseData = {
      wishlist: validWishlistItems.map((item) => ({
        _id: item._id,
        product: {
          _id: item.product._id,
          name: item.product.name,
          description: item.product.description,
          images: item.product.images,
          brand: item.product.brand,
          category: item.product.category,
          averageRating: item.product.averageRating || 0,
          currentPrice: item.product.price,
        },
        variant: {
          size: item.size,
          color: item.color,
        },
        priceAtTime: item.priceAtTime,
        priceChanged: Math.abs(item.product.price - item.priceAtTime) > 0.01,
        addedAt: item.addedAt,
        availability: {
          inStock: item.product.stock > 0,
          availableQuantity: item.product.stock,
        },
      })),
      wishlistSummary: {
        totalItems: totalItems,
        estimatedValue: Number(estimatedValue.toFixed(2)),
        currency: "USD",
        lastUpdated: user.updatedAt,
      },
    };

    // Send response with wishlist details
    res
      .status(200)
      .json(
        new ApiResponse(200, "Wishlist retrieved successfully", responseData)
      );
  } catch (error) {
    console.error("Failed to retrieve wishlist:", error);
    throw new ApiError(500, `Failed to retrieve wishlist: ${error.message}`);
  }
});

// Clear user's wishlist
export const clearWishlist = asyncHandler(async (req, res) => {
  const user = req.user;

  // Validate user authentication
  if (!user) {
    throw new ApiError(401, "User not authenticated");
  }

  // Check if wishlist has items
  if (!user.wishlist || user.wishlist.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, "Wishlist is already empty", {
        wishlist: [],
        wishlistSummary: {
          totalItems: 0,
          estimatedValue: 0,
          currency: "USD",
        },
      })
    );
  }

  try {
    // Store count before clearing for response
    const previousItemCount = user.wishlist.length;
    const previousEstimatedValue = user.getWishlistEstimatedValue
      ? user.getWishlistEstimatedValue()
      : 0;

    // Clear wishlist using schema method
    await user.clearWishlist();

    // Send response
    res.status(200).json(
      new ApiResponse(200, "Wishlist cleared successfully", {
        wishlist: [],
        wishlistSummary: {
          totalItems: 0,
          estimatedValue: 0,
          currency: "USD",
        },
        clearedInfo: {
          itemsRemoved: previousItemCount,
          previousEstimatedValue: Number(previousEstimatedValue.toFixed(2)),
        },
      })
    );
  } catch (error) {
    console.error("Failed to clear wishlist:", error);
    throw new ApiError(500, `Failed to clear wishlist: ${error.message}`);
  }
});

// Move item from wishlist to cart
export const moveToCart = asyncHandler(async (req, res) => {
  const { productId, size, color, quantity = 1 } = req.body;

  // Validate request data
  if (!productId || !size || !color) {
    throw new ApiError(400, "Product ID, size, and color are required");
  }

  if (quantity <= 0 || quantity > 100) {
    throw new ApiError(400, "Quantity must be between 1 and 100");
  }

  const user = req.user;

  // Check if item exists in wishlist
  const wishlistItem = user.wishlist.find(
    (item) =>
      item.product.toString() === productId.toString() &&
      item.size === size &&
      item.color === color
  );

  if (!wishlistItem) {
    throw new ApiError(404, "Item not found in wishlist");
  }

  // Get product details
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check stock availability
  if (!product.isInStock || !product.isInStock(size, color, quantity)) {
    throw new ApiError(
      400,
      `Insufficient stock for ${product.name} (${size}/${color})`
    );
  }

  try {
    // Get current price
    const currentPrice = product.getFinalPrice
      ? product.getFinalPrice(size, color)
      : product.price;

    // Add to cart
    await user.addToCart(productId, size, color, currentPrice, quantity);

    // Remove from wishlist
    await user.removeFromWishlist(productId, size, color);

    // Get updated data with populated details
    await user.populate([
      {
        path: "cart.product",
        select: "name images brand category",
      },
      {
        path: "wishlist.product",
        select: "name images brand category",
      },
    ]);

    // Send response
    res.status(200).json(
      new ApiResponse(200, "Item moved from wishlist to cart successfully", {
        cart: user.cart,
        wishlist: user.wishlist,
        cartSummary: {
          totalItems: user.cart.length,
          totalAmount: user.getCartTotal ? user.getCartTotal() : 0,
          currency: "USD",
        },
        wishlistSummary: {
          totalItems: user.getWishlistCount
            ? user.getWishlistCount()
            : user.wishlist.length,
          estimatedValue: user.getWishlistEstimatedValue
            ? user.getWishlistEstimatedValue()
            : 0,
          currency: "USD",
        },
        movedItem: {
          productId,
          productName: product.name,
          size,
          color,
          quantity,
          price: currentPrice,
        },
      })
    );
  } catch (error) {
    console.error("Failed to move item to cart:", error);
    throw new ApiError(500, `Failed to move item to cart: ${error.message}`);
  }
});
