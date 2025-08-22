import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  getOrdersToReview,
  addReview,
  getProductReviews,
  deleteReview,
} from "../controllers/review.controller.js";

const reviewRouter = express.Router();

// use auth middleware for all routes
reviewRouter.use(authMiddleware);

// Get orders to review
reviewRouter.get("/orders", getOrdersToReview);

// Add a review
reviewRouter.post("/add", addReview);

// Get reviews for a product
reviewRouter.get("/:productId/reviews", getProductReviews);

// Delete a review
reviewRouter.delete("/:productId/reviews/:reviewId", deleteReview);

export default reviewRouter;
