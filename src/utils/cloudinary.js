import { v2 as cloudinary } from "cloudinary";
import ApiError from "./ApiError.js";
import fs from "fs";

// Function to upload a file to Cloudinary
const uploadOnCloudinary = async (filePath) => {
  try {
    // Check if the file path is provided
    if (!filePath) {
      throw new ApiError(400, "File path is required for upload");
    }

    // cloudinary configuration
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Upload the file to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
      folder: "StallionWear",
    });

    // Check if the upload was successful
    if (!result || !result.secure_url) {
      throw new ApiError(500, "Failed to upload image to Cloudinary");
    }

    try {
      fs.unlinkSync(filePath); // Delete the file after upload
    } catch (error) {
      throw new ApiError(500, "Failed to delete local file after upload");
    }
  } catch (error) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Delete the file if it exists
      }
    } catch (err) {
      throw new ApiError(500, "Failed to delete file after upload");
    }

    // Handle any errors that occurred during the upload process
    throw new ApiError(
      error.status || 500,
      error.message || "An error occurred while uploading to Cloudinary"
    );
  }
};

export default uploadOnCloudinary;
