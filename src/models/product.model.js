import mongoose from "mongoose";


const productSchema = new mongoose.Schema(
 {
    name: {
        type : String,
        required: [true, "Product name is required"],
        minlength: 2,
        maxlength: 100,
        trim: true,
    },
    description :{
        type : String,
        required: [true, "Product description is required"],
        minlength: 10,
        trim: true,
    },
    price : {
        type: Number,
        required: [true, "Product price is required"],
        min: 0,
    },
    stock :{
        type: Number,
        required: [true, "Product stock is required"],
        min: 0,
    },
    brand : {
        type: String,
        required: [true, "Product brand is required"],
        trim: true,
    },
    category : {
        type: String,
        required: [true, "Product category is required"],
        trim: true,
    },
    variants : [
        {
            size : {type : String},
            color : {type : String},
            quantity : {
                type: Number,
                default: 0,
                min: 0,
            }

        }
    ], 
    images : {
        type : [String],
        required: [true, "Product images are required"],
        default: [],
    },
    reviews : [
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
)

const Product = mongoose.model("Product", productSchema);

export default Product;
