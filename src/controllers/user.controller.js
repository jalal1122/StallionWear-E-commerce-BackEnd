import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHanlder from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

// Function to register a new user
export const registerUser = asyncHanlder(async (req, res) => {
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
  } else {
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
