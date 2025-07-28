import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

// cookies Options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // set secure flag in production
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

  // upload profile picture if provided
  if (req.file) {
    // upload the image to cloudinary
    const result = await uploadOnCloudinary(req.file.path);

    // create a new user with the provided data
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || "user", // default to 'user' if role is not provided
      address: address || "",
      phone: phone || "",
      profilePicture: result.secure_url, // set the profile picture URL
    });

    // send a success response with the new user data
    res.status(201).json(
      new ApiResponse(201, "User registered successfully", {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        address: newUser.address,
        phone: newUser.phone,
        profilePicture: newUser.profilePicture,
      })
    );
  }
  // if no profile picture is provided, create a new user without it
  else {
    // create a new user without a profile picture
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || "user", // default to 'user' if role is not provided
      address: address || "",
      phone: phone || "",
    });

    // send a success response with the new user data
    res.status(201).json(
      new ApiResponse(201, "User registered successfully", {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        address: newUser.address,
        phone: newUser.phone,
        profilePicture: newUser.profilePicture,
      })
    );
  }
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
  await user.save();

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
