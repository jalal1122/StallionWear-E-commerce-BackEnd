import express from "express";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  clearWishlist,
  moveToCart
} from "../controllers/wishlist.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const wishlistRouter = express.Router();

// All routes require authentication
wishlistRouter.use(authMiddleware);

// @route GET /api/wishlist
// @access Private
wishlistRouter.get("/", getWishlist);

// @route POST /api/wishlist/add
wishlistRouter.post("/add", addToWishlist);

// @route DELETE /api/wishlist/remove
wishlistRouter.delete("/remove", removeFromWishlist);

// @route DELETE /api/wishlist/clear
wishlistRouter.delete("/clear", clearWishlist);

// @route POST /api/wishlist/move-to-cart
wishlistRouter.post("/moveToCart", moveToCart);

export default wishlistRouter;
