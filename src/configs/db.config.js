import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";

// Database connection configuration
const connectDB = async () => {
  try {
    // Set up mongoose connection options
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };

    // Connect to MongoDB using the URI from environment variables
    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    console.log(`MongoDB connected successfully: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (error) => {
      console.error("MongoDB connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  } catch (error) {
    // Log the error and throw an ApiError if connection fails
    console.error("Database connection failed:", error.message);
    throw new ApiError(500, "Database connection failed: " + error.message);
  }
};

export default connectDB;
