import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";

// Database connection configuration
const connectDB = async () => {
  try {
    // Connect to MongoDB using the URI from environment variables
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    // Log the error and throw an ApiError if connection fails
    throw new ApiError(500, "Database connection failed: " + error.message);
  }
};

export default connectDB;
