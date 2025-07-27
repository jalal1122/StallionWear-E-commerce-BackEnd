import express from "express";
import cookieParser from "cookie-parser";

const app = express();

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Route setup

export default app;