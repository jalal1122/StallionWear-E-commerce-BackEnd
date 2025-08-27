import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

// cookies Options
const cookieOptions = {
  httpOnly: true,
  secure: import.meta.env.NODE_ENV === "production",
};

// Function to register a new user
export const registerUser = asyncHandler(async (req, res) => {
  // get the user data from the request body
  const { name, email, password, role, address, phone } = req.body;

  // validate the required fields
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email, and password are required");
  }

  // check if the user already exists
  const existingUser = await User.findOne({ email }).select(
    "-password -refreshToken"
  );

  // throw an error if the user already exists
  if (existingUser) {
    throw new ApiError(400, "User already exists with this email");
  }

  // Prepare user data
  const userData = {
    name,
    email,
    password,
    role: role || "user",
    address: address || "",
    phone: phone || "",
  };

  // Upload profile picture if provided
  if (req.file) {
    const result = await uploadOnCloudinary(req.file.path);
    userData.profilePicture = result.secure_url;
  }

  // create a new user with the provided data
  const newUser = await User.create(userData);

  // Prepare response data (exclude sensitive fields)
  const responseData = {
    _id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    address: newUser.address,
    phone: newUser.phone,
    profilePicture: newUser.profilePicture,
  };

  // send a success response with the new user data
  res
    .status(201)
    .json(new ApiResponse(201, "User registered successfully", responseData));
});

// Function to login a user
export const loginUser = asyncHandler(async (req, res) => {
  // get the email and password from the request body
  const { email, password } = req.body;

  // validate the required fields
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // find the user by email and select the password field and refreshToken
  const user = await User.findOne({
    email,
  }).select("+password +refreshToken");

  // throw an error if the user does not exist
  if (!user) {
    throw new ApiError(404, "User not found with this email");
  }

  // check if the password is correct
  const isPasswordValid = await user.comparePassword(password);

  // throw an error if the password is incorrect
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // generate access token and refresh token for the user
  const accessToken = await user.generateAccessToken();

  const refreshToken = await user.generateRefreshToken();

  // update the user's refresh token in the database
  user.refreshToken = refreshToken;

  // save the user with the new refresh token
  await user.save({ validateModifiedOnly: true });

  // send a success response with the user data and tokens
  res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(
      new ApiResponse(200, "User logged in successfully", {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        phone: user.phone,
        profilePicture: user.profilePicture,
        accessToken, // send the access token in the response
        refreshToken, // send the refresh token in the response
      })
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  // Clear cookies on the client side
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  // If refreshToken exists, try to find and clear it from DB
  if (refreshToken) {
    const user = await User.findOne({ refreshToken });

    if (user) {
      user.refreshToken = "";
      await user.save({ validateModifiedOnly: true });
    }
  }

  // Return success response
  res.status(200).json(new ApiResponse(200, "Logged out successfully", null));
});

// Function to refresh access token using refresh token
export const refreshAccessToken = asyncHandler(async (req, res) => {
  // Get refresh token from cookies or request body
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  console.log("refreshing token");

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is missing");
  }

  // Find user with this refresh token
  const user = await User.findOne({ refreshToken }).select("-password");
  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }

  // Issue new access token
  const newAccessToken = user.generateAccessToken();

  // Send new tokens in response (cookie and body)
  res
    .status(200)
    .cookie("accessToken", newAccessToken, cookieOptions)
    .json(
      new ApiResponse(200, "Access token refreshed successfully", {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          address: user.address,
          phone: user.phone,
          profilePicture: user.profilePicture,
          accessToken: newAccessToken,
          refreshToken: refreshToken,
        },
      })
    );
});
