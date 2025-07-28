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
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [emailRegex, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
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
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        size: String,
        quantity: {
          type: Number,
          default: 1,
          min: [1, "Quantity must be at least 1"],
          max: [99, "Quantity cannot exceed 99"],
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

const User = mongoose.model("User", userSchema);

export default User;
