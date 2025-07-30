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
      quality: "auto",
      fetch_format: "auto",
    });

    // Check if the upload was successful
    if (!result || !result.secure_url) {
      throw new ApiError(500, "Failed to upload image to Cloudinary");
    }

    try {
      fs.unlinkSync(filePath); // Delete the file after upload
    } catch (error) {
      console.warn("Failed to delete local file:", error.message);
    }

    // Return the cloudinary response
    return result;
  } catch (error) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Delete the file if it exists
      }
    } catch (err) {
      console.warn("Failed to delete file after upload error:", err.message);
    }

    // Handle any errors that occurred during the upload process
    throw new ApiError(
      error.status || 500,
      error.message || "An error occurred while uploading to Cloudinary"
    );
  }
};

// Function to upload multiple files to Cloudinary
const uploadMultipleOnCloudinary = async (filePaths) => {
  try {
    if (!filePaths || filePaths.length === 0) {
      throw new ApiError(400, "File paths are required for upload");
    }

    // Configure cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadPromises = filePaths.map(async (filePath) => {
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          resource_type: "auto",
          folder: "StallionWear",
          quality: "auto",
          fetch_format: "auto",
        });

        // Delete local file after successful upload
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.warn("Failed to delete local file:", error.message);
        }

        return {
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
          original_filename: result.original_filename,
        };
      } catch (error) {
        // Delete local file even if upload failed
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.warn(
            "Failed to delete file after upload error:",
            err.message
          );
        }

        return {
          success: false,
          error: error.message,
          filePath,
        };
      }
    });

    const results = await Promise.all(uploadPromises);

    // Separate successful and failed uploads
    const successful = results.filter((result) => result.success);
    const failed = results.filter((result) => !result.success);

    if (successful.length === 0) {
      throw new ApiError(500, "All file uploads failed");
    }

    return {
      successful,
      failed,
      totalUploaded: successful.length,
      totalFailed: failed.length,
    };
  } catch (error) {
    // Clean up any remaining local files
    if (filePaths && Array.isArray(filePaths)) {
      filePaths.forEach((filePath) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.warn("Failed to delete file:", err.message);
        }
      });
    }

    throw new ApiError(
      error.status || 500,
      error.message ||
        "An error occurred while uploading multiple files to Cloudinary"
    );
  }
};

// Function to delete an image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new ApiError(500, "Failed to delete image from Cloudinary");
  }
};

export default uploadOnCloudinary;
export { uploadMultipleOnCloudinary, deleteFromCloudinary };
