import mongoose from "mongoose";

// A Schema for individual order items
const orderItemSchema = new mongoose.Schema({
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
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  }
}, { _id: false });

// Overall Order Schema
// This schema includes user details, order items, shipping address, payment method, and status
const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

//   here is the individual order item schema used in array for multiple items in an order
  orderItems: [orderItemSchema],

  shippingAddress: {
    fullName:   { type: String, required: true },
    address:    { type: String, required: true },
    city:       { type: String, required: true },
    postalCode: { type: String, required: true },
    country:    { type: String, required: true },
    phone:      { type: String, required: true },
  },

  paymentMethod: {
    type: String,
    enum: ["CashOnDelivery", "Stripe", "PayPal"],
    required: true,
  },

  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed"],
    default: "Pending",
  },

  shippingCharge: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },

  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },

  finalAmount: {
    type: Number,
    required: true,
    min: 0,
  },

  isDelivered: {
    type: Boolean,
    default: false,
  },

  deliveredAt: {
    type: Date,
  },

}, {
  timestamps: true,
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
