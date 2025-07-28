import express from "express";
import { registerUser } from "../controllers/user.controller.js";
import multerUpload from "../middlewares/multer.middleware.js";

const userRouter = express.Router();

// Route to register a new user
userRouter.post(
  "/register",
  multerUpload.single("profilePicture"), // Middleware to handle file upload
  registerUser
);

export default userRouter;
