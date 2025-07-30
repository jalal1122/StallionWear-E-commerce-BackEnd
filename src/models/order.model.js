import mongoose from "mongoose";

// A Schema for individual order items
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    size: {
      type: String,
      required: [true, "Size is required"],
      trim: true,
    },
    color: {
      type: String,
      required: [true, "Color is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number",
      },
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0.01, "Price must be greater than 0"],
      validate: {
        validator: function (v) {
          return Number.isFinite(v) && v > 0;
        },
        message: "Price must be a valid positive number",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// Overall Order Schema
// This schema includes user details, order items, shipping address, payment method, and status
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    //   here is the individual order item schema used in array for multiple items in an order
    orderItems: [orderItemSchema],

    shippingAddress: {
      fullName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      phone: { type: String, required: true },
    },

    paymentMethod: {
      type: String,
      enum: ["CashOnDelivery", "Stripe", "PayPal"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    orderStatus: {
      type: String,
      enum: ["Processing", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Processing",
    },

    trackingNumber: {
      type: String,
      trim: true,
    },

    shippingCharge: {
      type: Number,
      required: [true, "Shipping charge is required"],
      min: [0, "Shipping charge cannot be negative"],
      default: 0,
      validate: {
        validator: function (v) {
          return Number.isFinite(v) && v >= 0;
        },
        message: "Shipping charge must be a valid non-negative number",
      },
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0.01, "Total amount must be greater than 0"],
      validate: {
        validator: function (v) {
          return Number.isFinite(v) && v > 0;
        },
        message: "Total amount must be a valid positive number",
      },
    },

    finalAmount: {
      type: Number,
      required: [true, "Final amount is required"],
      min: [0.01, "Final amount must be greater than 0"],
      validate: {
        validator: function (v) {
          return Number.isFinite(v) && v > 0;
        },
        message: "Final amount must be a valid positive number",
      },
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      trim: true,
    },

    isDelivered: {
      type: Boolean,
      default: false,
    },

    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
orderSchema.index({ user: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "orderItems.product": 1 });

// Pre-save middleware to calculate subtotals
orderItemSchema.pre("validate", function () {
  if (this.price && this.quantity) {
    this.subtotal = this.price * this.quantity;
  }
});

// Pre-save middleware to validate order amounts
orderSchema.pre("save", function (next) {
  // Calculate total from order items
  const itemsTotal = this.orderItems.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  // Validate that totalAmount matches calculated total
  if (Math.abs(this.totalAmount - itemsTotal) > 0.01) {
    return next(new Error("Total amount does not match sum of order items"));
  }

  // Validate that finalAmount = totalAmount + shippingCharge - discount
  const expectedFinal = this.totalAmount + this.shippingCharge - this.discount;
  if (Math.abs(this.finalAmount - expectedFinal) > 0.01) {
    return next(new Error("Final amount calculation is incorrect"));
  }

  next();
});

// Instance methods
orderSchema.methods.canBeCancelled = function () {
  return ["Processing", "Confirmed"].includes(this.orderStatus);
};

orderSchema.methods.cancel = function () {
  if (!this.canBeCancelled()) {
    throw new Error("Order cannot be cancelled at this stage");
  }
  this.orderStatus = "Cancelled";
  return this.save();
};

orderSchema.methods.markAsDelivered = function () {
  this.orderStatus = "Delivered";
  this.isDelivered = true;
  this.deliveredAt = new Date();
  return this.save();
};

orderSchema.methods.updateStatus = function (newStatus, trackingNumber = null) {
  if (
    !["Processing", "Confirmed", "Shipped", "Delivered", "Cancelled"].includes(
      newStatus
    )
  ) {
    throw new Error("Invalid order status");
  }

  this.orderStatus = newStatus;

  if (trackingNumber) {
    this.trackingNumber = trackingNumber;
  }

  if (newStatus === "Delivered") {
    this.isDelivered = true;
    this.deliveredAt = new Date();
  }

  return this.save();
};

// Virtual for order total items count
orderSchema.virtual("totalItems").get(function () {
  return this.orderItems.reduce((total, item) => total + item.quantity, 0);
});

// Ensure virtuals are included when converting to JSON
orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

const Order = mongoose.model("Order", orderSchema);
export default Order;
