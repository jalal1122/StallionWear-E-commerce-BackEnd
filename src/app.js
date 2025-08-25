import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import userRouter from "./routes/user.route.js";
import productRouter from "./routes/product.route.js";
import orderRouter from "./routes/order.route.js";
import { generalLimiter } from "./middlewares/rateLimiter.middleware.js";
import cartRouter from "./routes/cart.route.js";
import wishlistRouter from "./routes/wishList.route.js";
import reviewRouter from "./routes/review.route.js";

const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Apply rate limiting to all requests
// app.use(generalLimiter);

// CORS configuration
app.use(
  cors({
    origin: [
      "https://stallion-wear-e-commerce-front-end-kappa.vercel.app/",
      "https://stallionwear.vercel.app/",
      "http://localhost:5173",
      "*"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Welcome to StallionWear API");
});

// User Routes
app.use("/api/user", userRouter);

// Product routes
app.use("/api/product", productRouter);

// Order routes
app.use("/api/order", orderRouter);

// Cart routes
app.use("/api/cart", cartRouter);

// Wishlist routes
app.use("/api/wishlist", wishlistRouter);

// Review routes
app.use("/api/review", reviewRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running successfully",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler - use a more specific pattern
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
