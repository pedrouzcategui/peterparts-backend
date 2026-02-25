import { Router } from "express";
import {
  createNewProduct,
  deleteExistingProduct,
  getAllProducts,
  getProduct,
  updateExistingProduct,
} from "../controllers/product.controller.ts";

const router = Router();

// GET /products - List all products
router.get("/", getAllProducts);

// GET /products/:id - Get a product by ID
router.get("/:id", getProduct);

// POST /products - Create a new product
router.post("/", createNewProduct);

// PUT /products/:id - Update a product by ID
router.put("/:id", updateExistingProduct);

// DELETE /products/:id - Delete a product by ID
router.delete("/:id", deleteExistingProduct);

export default router;
