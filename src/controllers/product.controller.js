import Product from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Order from "../models/order.model.js";
import uploadOnCloudinary, {
  uploadMultipleOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

// Function to create a new product
export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, brand, stock, variants } =
    req.body;

  // Validate required fields
  if (!name || !description || !price || !category || !brand) {
    throw new ApiError(
      400,
      "Name, description, price, category, and brand are required"
    );
  }

  // Check if product already exists
  const existingProduct = await Product.findOne({ name });
  if (existingProduct) {
    throw new ApiError(400, "Product already exists with this name");
  }

  // Handle multiple image uploads
  let images = [];
  if (req.files && req.files.length > 0) {
    const filePaths = req.files.map((file) => file.path);

    try {
      const uploadResults = await uploadMultipleOnCloudinary(filePaths);

      if (uploadResults.failed.length > 0) {
        console.warn(
          `${uploadResults.failed.length} images failed to upload:`,
          uploadResults.failed
        );
      }

      if (uploadResults.successful.length === 0) {
        throw new ApiError(500, "All image uploads failed");
      }

      images = uploadResults.successful.map((result) => result.url);
    } catch (error) {
      throw new ApiError(500, "Failed to upload product images");
    }
  } else {
    throw new ApiError(400, "At least one product image is required");
  }

  // Parse variants if provided
  let parsedVariants = [];
  if (variants) {
    try {
      parsedVariants =
        typeof variants === "string" ? JSON.parse(variants) : variants;
    } catch (error) {
      throw new ApiError(400, "Invalid variants format");
    }
  }

  // Create the product
  const newProduct = await Product.create({
    name,
    description,
    price: parseFloat(price),
    category,
    brand,
    stock: stock ? parseInt(stock) : 0,
    variants: parsedVariants,
    images,
    createdBy: req.user._id,
  });

  res.status(201).json(
    new ApiResponse(201, "Product created successfully", {
      _id: newProduct._id,
      name: newProduct.name,
      description: newProduct.description,
      price: newProduct.price,
      category: newProduct.category,
      brand: newProduct.brand,
      stock: newProduct.stock,
      variants: newProduct.variants,
      images: newProduct.images,
      averageRating: newProduct.averageRating,
      totalStock: newProduct.totalStock,
    })
  );
});

// Function to get all products with optional filters and pagination
export const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    brand,
    minPrice,
    maxPrice,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  // Validate pagination parameters
  if (page < 1 || limit < 1) {
    throw new ApiError(400, "Page and limit must be greater than 0");
  }

  console.log(
    `Fetching products - Page: ${page}, Limit: ${limit}, Category: ${category}, Brand: ${brand}, Min Price: ${minPrice}, Max Price: ${maxPrice}, Search: ${search}, Sort By: ${sortBy}, Sort Order: ${sortOrder}`
  );

  // Build query object
  let query = {};

  // Category filter
  if (category) {
    // Handle categories array
    let categoryArray;
    if (typeof category === "string") {
      try {
        // If it's a JSON string, parse it
        categoryArray = JSON.parse(category);
      } catch (error) {
        // If it's a comma-separated string, split it
        categoryArray = category.split(",").map((cat) => cat.trim());
      }
    } else if (Array.isArray(category)) {
      categoryArray = category.map((cat) => cat.trim());
    }

    if (categoryArray && categoryArray.length > 0) {
      query.category = { $in: categoryArray };
    }
  } else if (category) {
    // Handle single category (backward compatibility)
    query.category = category;
  }

  // Brand filter
  if (brand) {
    // query.brand = brand;
    query.brand = { $regex: brand, $options: "i" };
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Execute query with pagination
  const products = await Product.find(query)
    .populate("createdBy", "name")
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .limit(limit * 1)
    .skip((parseInt(page) - 1) * limit);

  const totalProducts = await Product.countDocuments(query);

  // If no products found
  if (products.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, "No products found", {
        products: [],
        totalProducts: 0,
        totalPages: 0,
        currentPage: page,
      })
    );
  }

  res.status(200).json(
    new ApiResponse(200, "Products fetched successfully", {
      products,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    })
  );
});

// function to get the new arrivals product from each category
export const getNewArrivals = asyncHandler(async (req, res) => {
  const products = await Product.aggregate([
    {
      // Sort all products by creation date (newest first)
      $sort: { createdAt: -1 },
    },
    {
      // Group by category and get the first (newest) product from each category
      $group: {
        _id: "$category",
        latestProduct: { $first: "$$ROOT" },
      },
    },
    {
      // Replace the root with the actual product document
      $replaceRoot: { newRoot: "$latestProduct" },
    },
    {
      // Sort the results by creation date (newest categories first)
      $sort: { createdAt: -1 },
    },
    {
      // Limit to 10 categories
      $limit: 10,
    },
  ]);

  // Send response
  res
    .status(200)
    .json(new ApiResponse(200, "New arrivals fetched successfully", products));
});

// Function to get top selling products based on order data
export const getTopSellingProducts = asyncHandler(async (req, res) => {
  const topProducts = await Order.aggregate([
    {
      // Match only delivered/completed orders
      $match: {
        orderStatus: { $in: ["Delivered", "Shipped"] },
      },
    },
    {
      // Unwind the orderItems array
      $unwind: "$orderItems",
    },
    {
      // Group by product and sum quantities
      $group: {
        _id: "$orderItems.product",
        totalQuantitySold: { $sum: "$orderItems.quantity" },
        totalRevenue: { $sum: "$orderItems.subtotal" },
        orderCount: { $sum: 1 },
      },
    },
    {
      // Sort by total quantity sold (descending)
      $sort: { totalQuantitySold: -1 },
    },
    {
      // Limit to top 5
      $limit: 5,
    },
    {
      // Lookup product details
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    {
      // Unwind product details
      $unwind: "$productDetails",
    },
    {
      // Project final structure
      $project: {
        _id: "$productDetails._id",
        name: "$productDetails.name",
        description: "$productDetails.description",
        price: "$productDetails.price",
        category: "$productDetails.category",
        brand: "$productDetails.brand",
        images: "$productDetails.images",
        variants: "$productDetails.variants",
        totalQuantitySold: 1,
        totalRevenue: 1,
        orderCount: 1,
      },
    },
  ]);

  // Fallback if no sales data found
  if (topProducts.length === 0) {
    const fallbackProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Top selling products fetched successfully (showing newest products)",
          fallbackProducts
        )
      );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Top selling products fetched successfully",
        topProducts
      )
    );
});

// Function to get a product by ID
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

// Function to update a product
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, brand, stock, variants } =
    req.body;

  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, "Product not found with this ID");
  }

  // Prepare update object
  const updates = {};
  if (name) updates.name = name;
  if (description) updates.description = description;
  if (price) updates.price = parseFloat(price);
  if (category) updates.category = category;
  if (brand) updates.brand = brand;
  if (stock !== undefined) updates.stock = parseInt(stock);

  // Handle variants update
  if (variants) {
    try {
      updates.variants =
        typeof variants === "string" ? JSON.parse(variants) : variants;
    } catch (error) {
      throw new ApiError(400, "Invalid variants format");
    }
  }

  // Handle new image uploads
  if (req.files && req.files.length > 0) {
    const filePaths = req.files.map((file) => file.path);

    try {
      const uploadResults = await uploadMultipleOnCloudinary(filePaths);

      if (uploadResults.successful.length > 0) {
        const newImages = uploadResults.successful.map((result) => result.url);

        // Option 1: Replace all images
        updates.images = newImages;

        // Option 2: Add to existing images (uncomment this and comment above if you want to append)
        // updates.images = [...product.images, ...newImages];
      }
    } catch (error) {
      throw new ApiError(500, "Failed to upload new product images");
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).populate("createdBy", "name");

  res.status(200).json(
    new ApiResponse(200, "Product updated successfully", {
      _id: updatedProduct._id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      price: updatedProduct.price,
      category: updatedProduct.category,
      brand: updatedProduct.brand,
      stock: updatedProduct.stock,
      variants: updatedProduct.variants,
      images: updatedProduct.images,
      averageRating: updatedProduct.averageRating,
      totalStock: updatedProduct.totalStock,
      createdBy: updatedProduct.createdBy,
    })
  );
});

// Function to delete a product
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
