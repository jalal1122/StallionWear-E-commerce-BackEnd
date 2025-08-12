import express from "express";
import {
  addToCart,
  removeFromCart,
  clearCart,
  getCartDetails,
  decrementCartItem,
  incrementCartItem,
} from "../controllers/cart.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const cartRouter = express.Router();

// All routes require authentication
cartRouter.use(authMiddleware);

// @desc Get cart details
// @route GET /api/cart
// @access Private
cartRouter.get("/", getCartDetails);

// @desc Add an item to the cart
// @route POST /api/cart
// @access Private
cartRouter.post("/add", addToCart);

// @desc Remove an item from the cart
// @route DELETE /api/cart/:itemId
// @access Private
cartRouter.patch("/remove", removeFromCart);

// @desc Clear the cart
// @route DELETE /api/cart/clear
// @access Private
cartRouter.delete("/clear", clearCart);

// @desc Decrement item quantity in the cart
// @route PATCH /api/cart/decrement
// @access Private
cartRouter.patch("/decrement", decrementCartItem);

// @desc Increment item quantity in the cart
// @route PATCH /api/cart/increment/:itemId
// @access Private
cartRouter.patch("/increment", incrementCartItem);

export default cartRouter;
