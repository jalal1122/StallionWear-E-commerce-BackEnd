import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
} from "../controllers/user.controller.js";
import multerUpload from "../middlewares/multer.middleware.js";

const userRouter = express.Router();

// @desc Route to register a new user
userRouter.post(
  "/register",
  multerUpload.single("profilePicture"), // Middleware to handle file upload
  registerUser
);

// @desc Route to login a user
userRouter.post("/login", loginUser);

// @desc Route to logout a user
userRouter.put("/logout", logoutUser);

export default userRouter;
