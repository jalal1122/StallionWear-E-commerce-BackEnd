import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

const authMiddleware = asyncHandler(async (req, res, next) => {
  // Check if the request has an authorization header or from cookies
  const token =
    req.headers.authorization?.split(" ")[1] || req.cookies.accessToken;

  // If token is not present, return an error
  if (!token) {
    throw new ApiError(401, "Access token is missing or invalid");
  }

  try {
    // verify the token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // If the token is not valid or expired, decoded will be falsy
    if (!decoded) {
      throw new ApiError(401, "Access token is invalid or expired");
    }

    // Find the user by ID from the decoded token
    const user = await User.findById(decoded.id).select(
      "-password -refreshToken"
    );

    // If user is not found, return an error
    if (!user) {
      throw new ApiError(404, "User not found with the provided token");
    }

    // Attach user to the request object for further use in the route handlers
    req.user = user;

    next();
  } catch (error) {
    // Handle JWT verification errors
    if (error.name === "JsonWebTokenError") {
      throw new ApiError(401, "Invalid access token");
    } else if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token has expired");
    } else if (error.name === "NotBeforeError") {
      throw new ApiError(401, "Access token not active");
    }
    // Re-throw other errors (including ApiError instances)
    throw error;
  }
});

export default authMiddleware;
