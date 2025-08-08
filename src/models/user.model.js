import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Email Regex
const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

// Password: Min 8 chars, at least one letter, one number, and one special character
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

// 🔐 User Schema Definition
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      minlength: 2,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [emailRegex, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      trim: true,
      match: [
        passwordRegex,
        "Password must contain at least 8 characters with one letter, one number, and one special character",
      ],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    address: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          // Allow empty string or valid phone number
          return v === "" || /^[\+]?[1-9][\d]{0,15}$/.test(v);
        },
        message: "Please enter a valid phone number",
      },
    },
    profilePicture: {
      type: String,
      default:
        "https://rugby.vlaanderen/wp-content/uploads/2018/03/Anonymous-Profile-pic.jpg",
    },
    wishlist: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        size: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          required: true,
        },
        priceAtTime: {
          type: Number,
          required: true,
          min: 0,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        size: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: [1, "Quantity must be at least 1"],
          max: [99, "Quantity cannot exceed 99"],
        },
        priceAtTime: {
          type: Number,
          required: true,
          min: 0,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    refreshToken: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// 🔐 Encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// generate JWT access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// generate JWT refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

// Cart utility methods
userSchema.methods.addToCart = function (
  productId,
  size,
  color,
  price,
  quantity = 1
) {
  const cartItemIndex = this.cart.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      item.size === size &&
      item.color === color
  );

  if (cartItemIndex > -1) {
    // Update existing item
    this.cart[cartItemIndex].quantity += quantity;
    this.cart[cartItemIndex].priceAtTime = price; // Update price
  } else {
    // Add new item
    this.cart.push({
      product: productId,
      size,
      color,
      quantity,
      priceAtTime: price,
    });
  }
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.removeFromCart = function (productId, size, color) {
  this.cart = this.cart.filter(
    (item) =>
      !(
        item.product.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
      )
  );
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.clearCart = function () {
  this.cart = [];
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.getCartTotal = function () {
  return this.cart.reduce((total, item) => {
    return total + item.priceAtTime * item.quantity;
  }, 0);
};

// Wishlist utility methods
userSchema.methods.addToWishlist = function (productId, size, color, price) {
  const idx = this.wishlist.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      item.size === size &&
      item.color === color
  );

  if (idx > -1) {
    // Update price snapshot & timestamp
    this.wishlist[idx].priceAtTime = price;
    this.wishlist[idx].addedAt = Date.now();
  } else {
    this.wishlist.push({
      product: productId,
      size,
      color,
      priceAtTime: price,
    });
  }
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.removeFromWishlist = function (productId, size, color) {
  this.wishlist = this.wishlist.filter(
    (item) =>
      !(
        item.product.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
      )
  );
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.clearWishlist = function () {
  this.wishlist = [];
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.getWishlistCount = function () {
  return this.wishlist.length;
};

userSchema.methods.getWishlistEstimatedValue = function () {
  return this.wishlist.reduce((sum, item) => sum + item.priceAtTime, 0);
};

const User = mongoose.model("User", userSchema);

export default User;
