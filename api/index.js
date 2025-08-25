// Vercel serverless function entry point
import app from "../src/app.js";
import connectDB from "../src/configs/db.config.js";
import { config } from "dotenv";
import validateEnvVars from "../src/utils/validateEnv.js";

// config the environment variables
config();

// Validate required environment variables
validateEnvVars();

let isConnected = false;

// Connect to database only once
const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    await connectDB();
    isConnected = true;
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
};

// Export the serverless function
export default async (req, res) => {
  try {
    // Ensure database is connected
    await connectToDatabase();

    // Handle the request with the Express app
    return app(req, res);
  } catch (error) {
    console.error("Serverless function error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
