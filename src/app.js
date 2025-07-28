import express from "express";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.route.js";

const app = express();

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Route setup
app.use("/api/user", userRouter);

export default app;
