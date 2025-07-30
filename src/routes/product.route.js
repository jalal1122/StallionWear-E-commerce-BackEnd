import express from "express";
import {
  createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct
} from "../controllers/product.controller.js";
import multerUpload from "../middlewares/multer.middleware.js";

const productRouter = express.Router();


productRouter.post(
  "/create",
  multerUpload.single("productImage"), createProduct
);

productRouter.get("/", getAllProducts);
productRouter.get("/:id", getProductById);
productRouter.put(
  "/update/:id",
  multerUpload.single("productImage"), updateProduct
);
productRouter.delete("/:id", deleteProduct);

export default productRouter;