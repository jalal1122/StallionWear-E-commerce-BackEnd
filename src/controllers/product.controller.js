import Product from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, stock } = req.body;

  if (!name || !description || !price) {
    throw new ApiError(400, "Name, description, and price are required");
  }

  const existingProduct = await Product.findOne({ name }).select(
    "-createdAt -updatedAt"
  );

  if (existingProduct) {
    throw new ApiError(400, "Product already exists with this name");
  }

  let images = [];

  if (req.file) {
    const result = await uploadOnCloudinary(req.file.path);
    images = [result.secure_url];

    const newProduct = await Product.create({
      name,
      description,
      price,
      category: category || "",
      stock: stock || 0,
      images,
    });

    res.status(201).json(
      new ApiResponse(201, "Product created successfully", {
        _id: newProduct._id,
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        category: newProduct.category,
        stock: newProduct.stock,
        images: newProduct.images,
      })
    );
  } else {
    throw new ApiError(400, "Product image is required");
  }
});

export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().select("-createdAt -updatedAt");

  if (!products) {
    return res.status(200).json(new ApiResponse(200, "No products found", []));
  }

  res
    .status(200)
    .json(new ApiResponse(200, "All Products fetched successfully", products));
});

export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  const product = await Product.findById(id).select("-createdAt -updatedAt");
  if (!product) {
    throw new ApiError(404, "Product not found with this ID");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Product fetched successfully", product));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  const product = await Product.findById(id).select("-createdAt -updatedAt");
  if (!product) {
    throw new ApiError(404, "Product not found with this ID");
  }

  if (req.file) {
    const result = await uploadOnCloudinary(req.file.path);
    updates.images = [result.secure_url];
  }

  const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).select("-createdAt -updatedAt");

  if (!updatedProduct) {
    throw new ApiError(404, "Product not found with this ID");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Product updated successfully", updatedProduct));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  const product = await Product.findByIdAndDelete(id).select(
    "-createdAt -updatedAt"
  );
  if (!product) {
    throw new ApiError(404, "Product not found with this ID");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Product deleted successfully", product));
});
