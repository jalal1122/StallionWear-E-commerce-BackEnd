import express from "express";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  clearWishlist,
} from "../controllers/wishlist.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const wishlistRouter = express.Router();

// All routes require authentication
wishlistRouter.use(authMiddleware);

// @route POST /api/wishlist/add
wishlistRouter.post("/add", addToWishlist);

// @route DELETE /api/wishlist/remove
wishlistRouter.delete("/remove", removeFromWishlist);

// @route GET /api/wishlist
// @access Private
wishlistRouter.get("/", getWishlist);

// @route DELETE /api/wishlist/clear
wishlistRouter.delete("/clear", clearWishlist);

export default wishlistRouter;
