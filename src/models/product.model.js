import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      minlength: 2,
      maxlength: 100,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      minlength: 10,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0.01, "Price must be greater than 0"],
      validate: {
        validator: function (v) {
          return Number.isFinite(v) && v > 0;
        },
        message: "Price must be a valid positive number",
      },
    },
    stock: {
      type: Number,
      required: [true, "Product stock is required"],
      min: 0,
    },
    brand: {
      type: String,
      required: [true, "Product brand is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      trim: true,
    },
    variants: [
      {
        size: {
          type: String,
          required: [true, "Size is required for variants"],
          trim: true,
        },
        color: {
          type: String,
          required: [true, "Color is required for variants"],
          trim: true,
        },
        quantity: {
          type: Number,
          default: 0,
          min: [0, "Quantity cannot be negative"],
          validate: {
            validator: Number.isInteger,
            message: "Quantity must be a whole number",
          },
        },
        priceModifier: {
          type: Number,
          default: 0,
          validate: {
            validator: function (v) {
              return Number.isFinite(v);
            },
            message: "Price modifier must be a valid number",
          },
        },
      },
    ],
    images: {
      type: [String],
      required: [true, "Product images are required"],
      default: [],
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          required: true,
          minlength: 10,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
productSchema.index({ name: "text", description: "text", brand: "text" });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdBy: 1 });
productSchema.index({ "variants.size": 1, "variants.color": 1 });

// Virtual for average rating
productSchema.virtual("averageRating").get(function () {
  if (this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / this.reviews.length) * 10) / 10; // Round to 1 decimal
});

// Virtual for total stock across all variants
productSchema.virtual("totalStock").get(function () {
  return this.variants.reduce((total, variant) => total + variant.quantity, 0);
});

// Method to check if product is in stock for specific variant
productSchema.methods.isInStock = function (size, color, quantity = 1) {
  const variant = this.variants.find(
    (v) => v.size === size && v.color === color
  );
  return variant && variant.quantity >= quantity;
};

// Method to get variant by size and color
productSchema.methods.getVariant = function (size, color) {
  return this.variants.find((v) => v.size === size && v.color === color);
};

// Method to update variant stock
productSchema.methods.updateVariantStock = function (size, color, quantity) {
  const variant = this.getVariant(size, color);
  if (variant) {
    variant.quantity = Math.max(0, variant.quantity - quantity);
    return this.save();
  }
  throw new Error("Variant not found");
};

// Method to get final price including variant modifier
productSchema.methods.getFinalPrice = function (size, color) {
  const variant = this.getVariant(size, color);
  const modifier = variant ? variant.priceModifier : 0;
  return this.price + modifier;
};

// Ensure virtuals are included when converting to JSON
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

const Product = mongoose.model("Product", productSchema);

export default Product;
