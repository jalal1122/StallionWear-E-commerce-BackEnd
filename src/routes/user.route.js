import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
} from "../controllers/user.controller.js";
import { uploadSingle } from "../middlewares/multer.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";
import {
  validateUserRegistration,
  validateUserLogin,
} from "../middlewares/validation.middleware.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const userRouter = express.Router();

// @desc Route to register a new user
userRouter.post(
  "/register",
  authLimiter, // Apply rate limiting
  uploadSingle, // Handle single profile picture upload
  validateUserRegistration, // Apply validation
  registerUser
);

// @desc Route to login a user
userRouter.post(
  "/login",
  authLimiter, // Apply rate limiting
  validateUserLogin, // Apply validation
  loginUser
);

// @desc Route to logout a user
userRouter.post(
  "/logout",
  authMiddleware, // Require authentication
  logoutUser
);

export default userRouter;
