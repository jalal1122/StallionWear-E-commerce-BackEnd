import asyncHandler from "../utils/asyncHandler.js";
import Product from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Function to add an item to the cart
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, size, color, price, quantity = 1 } = req.body;

  // Validate request data
  if (!productId || !size || !color || !price || !quantity) {
    throw new ApiError(
      400,
      "All fields (productId, size, color, price, quantity) are required"
    );
  }

  // Validate quantity
  if (quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  if (quantity > 100) {
    throw new ApiError(400, "Maximum quantity per item is 100");
  }

  // Check if product exists and populate variants
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Validate user authentication
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const user = req.user;

  // Validate price against product price
  const expectedPrice = product.getFinalPrice
    ? product.getFinalPrice(size, color)
    : product.price;
  if (Math.abs(price - expectedPrice) > 0.01) {
    throw new ApiError(
      400,
      `Price mismatch. Expected: ${expectedPrice}, Received: ${price}`
    );
  }

  // Check if product variant exists and is in stock
  const isValidVariant = product.isInStock
    ? product.isInStock(size, color, quantity)
    : true;
  if (!isValidVariant) {
    throw new ApiError(
      400,
      `Product variant (Size: ${size}, Color: ${color}) is not available or insufficient stock`
    );
  }

  // Check if user has addToCart method
  if (!user.addToCart || typeof user.addToCart !== "function") {
    throw new ApiError(500, "User cart functionality not available");
  }

  try {
    // Add item to user's cart
    await user.addToCart(productId, size, color, price, quantity);
    await user.save({ validateBeforeSave: false });

    // Get updated cart with populated product details
    await user.populate({
      path: "cart.product",
      select: "name images brand category",
    });

    // Calculate totals
    const cartTotal = user.getCartTotal ? user.getCartTotal() : 0;
    const cartItemCount = user.cart ? user.cart.length : 0;

    // Send success response with detailed information
    res.status(201).json(
      new ApiResponse(201, "Item added to cart successfully", {
        cart: user.cart,
        cartSummary: {
          totalItems: cartItemCount,
          totalAmount: cartTotal,
          currency: "USD",
        },
        addedItem: {
          productId,
          productName: product.name,
          size,
          color,
          price,
          quantity,
          subtotal: price * quantity,
        },
      })
    );
  } catch (error) {
    console.error("Cart operation failed:", error);
    throw new ApiError(500, `Failed to add item to cart: ${error.message}`);
  }
});

// Function to remove an item from the cart
export const removeFromCart = asyncHandler(async (req, res) => {
  const { productId, size, color } = req.body;

  // Validate request data
  if (!productId || !size || !color) {
    throw new ApiError(400, "All fields (productId, size, color) are required");
  }

  // Validate user authentication
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const user = req.user;

  // Validate that cart exists
  if (!user.cart || user.cart.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  // Find the cart item to be removed
  const cartItemIndex = user.cart.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      item.size === size &&
      item.color === color
  );

  if (cartItemIndex === -1) {
    throw new ApiError(404, "Item not found in cart");
  }

  // Store details of the item being removed for response
  const removedItem = {
    productId: user.cart[cartItemIndex].product,
    size: user.cart[cartItemIndex].size,
    color: user.cart[cartItemIndex].color,
    quantity: user.cart[cartItemIndex].quantity,
    price: user.cart[cartItemIndex].price,
    subtotal: user.cart[cartItemIndex].subtotal,
  };

  try {
    // Remove item from cart (two approaches)

    // Approach 1: Use user method if it exists
    if (user.removeFromCart && typeof user.removeFromCart === "function") {
      await user.removeFromCart(productId, size, color);
    } else {
      // Approach 2: Remove directly from array
      user.cart.splice(cartItemIndex, 1);
      user.markModified("cart");
    }

    await user.save({ validateBeforeSave: false });

    // Get updated cart with populated product details
    if (user.cart.length > 0) {
      await user.populate({
        path: "cart.product",
        select: "name images brand category",
      });
    }

    // Calculate updated totals
    const cartTotal = user.getCartTotal ? user.getCartTotal() : 0;
    const cartItemCount = user.cart ? user.cart.length : 0;

    // Send success response with detailed information
    res.status(200).json(
      new ApiResponse(200, "Item removed from cart successfully", {
        cart: user.cart,
        cartSummary: {
          totalItems: cartItemCount,
          totalAmount: cartTotal,
          currency: "USD",
        },
        removedItem: {
          productId: removedItem.productId,
          size: removedItem.size,
          color: removedItem.color,
          quantity: removedItem.quantity,
          refundAmount: removedItem.subtotal,
        },
        // Additional helpful info
        cartStatus: cartItemCount === 0 ? "empty" : "has_items",
      })
    );
  } catch (error) {
    console.error("Cart removal operation failed:", error);
    throw new ApiError(
      500,
      `Failed to remove item from cart: ${error.message}`
    );
  }
});

// Function to clear entire cart
export const clearCart = asyncHandler(async (req, res) => {
  const user = req.user;

  user.cart = [];
  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, "Cart cleared successfully", {
      cart: [],
      cartSummary: {
        totalItems: 0,
        totalAmount: 0,
        currency: "USD",
      },
    })
  );
});

// Function to get cart details
export const getCartDetails = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.cart || user.cart.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, "Cart is empty", {
        cart: [],
        cartSummary: {
          totalItems: 0,
          totalAmount: 0,
          currency: "USD",
        },
      })
    );
  }

  try {
    // Populate product details in cart items
    await user.populate({
      path: "cart.product",
      select: "name images brand category price", // Added price for reference
    });

    // Calculate totals
    const cartTotal = user.getCartTotal ? user.getCartTotal() : 0;
    const cartItemCount = user.cart ? user.cart.length : 0;

    // Send response with cart details
    res.status(200).json(
      new ApiResponse(200, "Cart details retrieved successfully", {
        cart: user.cart,
        cartSummary: {
          totalItems: cartItemCount,
          totalAmount: cartTotal,
          currency: "USD",
        },
      })
    );

  } catch (error) {
    console.error("Failed to get cart details:", error);
    throw new ApiError(500, "Failed to retrieve cart details");
  }
});

// Function to decrement (minus 1) item quantity in cart
export const decrementCartItem = asyncHandler(async (req, res) => {
  const { productId, size, color } = req.body;

  // Validate request data
  if (!productId || !size || !color) {
    throw new ApiError(400, "All fields (productId, size, color) are required");
  }

  // Validate user authentication
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const user = req.user;

  // Validate that cart exists
  if (!user.cart || user.cart.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  // Find the cart item to be decremented
  const cartItemIndex = user.cart.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      item.size === size &&
      item.color === color
  );

  if (cartItemIndex === -1) {
    throw new ApiError(404, "Item not found in cart");
  }

  // Check if quantity is greater than 1
  if (user.cart[cartItemIndex].quantity <= 1) {
    throw new ApiError(400, "Cannot decrement quantity below 1. Use remove item instead.");
  }

  // Decrement the quantity and update subtotal
  user.cart[cartItemIndex].quantity -= 1;
  user.cart[cartItemIndex].subtotal = user.cart[cartItemIndex].price * user.cart[cartItemIndex].quantity;

  await user.save({ validateBeforeSave: false });

  // Get updated cart with populated product details
  await user.populate({
    path: "cart.product",
    select: "name images brand category",
  });

  res.status(200).json(
    new ApiResponse(200, "Cart item quantity decremented successfully", {
      cart: user.cart,
      cartSummary: {
        totalItems: user.cart.length,
        totalAmount: user.getCartTotal ? user.getCartTotal() : 0,
        currency: "USD",
      },
      updatedItem: {
        productId,
        size,
        color,
        newQuantity: user.cart[cartItemIndex].quantity,
        newSubtotal: user.cart[cartItemIndex].subtotal
      }
    })
  );
});

// Function to increment (plus 1) item quantity in cart
export const incrementCartItem = asyncHandler(async (req, res) => {
  const { productId, size, color } = req.body;

  // Validate request data
  if (!productId || !size || !color) {
    throw new ApiError(400, "All fields (productId, size, color) are required");
  }

  // Validate user authentication
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const user = req.user;

  // Validate that cart exists
  if (!user.cart || user.cart.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  // Find the cart item to be incremented
  const cartItemIndex = user.cart.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      item.size === size &&
      item.color === color
  );

  if (cartItemIndex === -1) {
    throw new ApiError(404, "Item not found in cart");
  }

  // Check maximum quantity limit
  if (user.cart[cartItemIndex].quantity >= 100) {
    throw new ApiError(400, "Maximum quantity per item is 100");
  }

  // Optional: Check product stock availability
  const product = await Product.findById(productId);
  if (product && product.stock && user.cart[cartItemIndex].quantity >= product.stock) {
    throw new ApiError(400, "Cannot add more items. Insufficient stock available.");
  }

  // Increment the quantity and update subtotal
  user.cart[cartItemIndex].quantity += 1;
  user.cart[cartItemIndex].subtotal = user.cart[cartItemIndex].price * user.cart[cartItemIndex].quantity;

  await user.save({ validateBeforeSave: false });

  // Get updated cart with populated product details
  await user.populate({
    path: "cart.product",
    select: "name images brand category",
  });

  res.status(200).json(
    new ApiResponse(200, "Cart item quantity incremented successfully", {
      cart: user.cart,
      cartSummary: {
        totalItems: user.cart.length,
        totalAmount: user.getCartTotal ? user.getCartTotal() : 0,
        currency: "USD",
      },
      updatedItem: {
        productId,
        size,
        color,
        newQuantity: user.cart[cartItemIndex].quantity,
        newSubtotal: user.cart[cartItemIndex].subtotal
      }
    })
  );
});