import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  getOrdersToReview,
  addReview,
  getProductReviews,
  deleteReview,
} from "../controllers/review.controller.js";

const reviewRouter = express.Router();

// Get reviews for a product
reviewRouter.get("/:productId/reviews", getProductReviews);

// Get orders to review
reviewRouter.get("/orders", authMiddleware, getOrdersToReview);

// Add a review
reviewRouter.post("/add", authMiddleware, addReview);

// Delete a review
reviewRouter.delete(
  "/:productId/reviews/:reviewId",
  authMiddleware,
  deleteReview
);

export default reviewRouter;
