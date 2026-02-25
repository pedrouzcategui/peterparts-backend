import type { Request, Response } from "express";
import { Brand, Prisma } from "../../generated/prisma/client.ts";
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
  type UpdateProductInput,
} from "../models/product.model.ts";
import {
  type CreateProductDTO,
  type ErrorResponse,
  type ProductDTO,
  type UpdateProductDTO,
} from "../types/product.dto.ts";

const isBrand = (value: unknown): value is Brand =>
  value === Brand.Cuisinart || value === Brand.Kitchenaid;

const normalizePrice = (value: unknown): string | number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
};

const normalizeImages = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const images = value.filter((item) => typeof item === "string");
  return images.length === value.length ? images : null;
};

const normalizeStock = (value: unknown): number | undefined | null => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const isKnownPrismaNotFound = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2025";

export const getAllProducts = async (
  req: Request,
  res: Response<ProductDTO[] | ErrorResponse>,
) => {
  try {
    const products = await listProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to list products" });
  }
};

export const getProduct = async (
  req: Request<{ id: string }, ProductDTO | ErrorResponse>,
  res: Response<ProductDTO | ErrorResponse>,
) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

export const createNewProduct = async (
  req: Request<{}, ProductDTO | ErrorResponse, CreateProductDTO>,
  res: Response<ProductDTO | ErrorResponse>,
) => {
  const { gearId, title, description, brand, category, price, images, stock } =
    req.body ?? {};

  const normalizedPrice = normalizePrice(price);
  const normalizedImages = normalizeImages(images);
  const normalizedStock = normalizeStock(stock);

  if (
    typeof gearId !== "string" ||
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof category !== "string" ||
    !isBrand(brand) ||
    normalizedPrice === null ||
    normalizedImages === null ||
    normalizedStock === null
  ) {
    res.status(400).json({ message: "Invalid product payload" });
    return;
  }

  try {
    const product = await createProduct({
      gearId,
      title,
      description,
      brand,
      category,
      price: normalizedPrice,
      images: normalizedImages,
      stock: 0, // Default stock to 0 if not provided
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: `Failed to create product` });
  }
};

export const updateExistingProduct = async (
  req: Request<{ id: string }, ProductDTO | ErrorResponse, UpdateProductDTO>,
  res: Response<ProductDTO | ErrorResponse>,
) => {
  const { brand, price, images, stock, ...rest } = req.body ?? {};
  const data: UpdateProductInput = { ...rest };

  if (brand !== undefined) {
    if (!isBrand(brand)) {
      res.status(400).json({ message: "Invalid brand" });
      return;
    }
    data.brand = brand;
  }

  if (price !== undefined) {
    const normalizedPrice = normalizePrice(price);
    if (normalizedPrice === null) {
      res.status(400).json({ message: "Invalid price" });
      return;
    }
    data.price = normalizedPrice;
  }

  if (images !== undefined) {
    const normalizedImages = normalizeImages(images);
    if (!normalizedImages) {
      res.status(400).json({ message: "Invalid images" });
      return;
    }
    data.images = normalizedImages;
  }

  if (stock !== undefined) {
    const normalizedStock = normalizeStock(stock);
    if (normalizedStock === null || normalizedStock === undefined) {
      res.status(400).json({ message: "Invalid stock" });
      return;
    }
    data.stock = normalizedStock;
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ message: "No fields to update" });
    return;
  }

  try {
    const product = await updateProduct(req.params.id, data);
    res.json(product);
  } catch (error) {
    if (isKnownPrismaNotFound(error)) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    res.status(500).json({ message: "Failed to update product" });
  }
};

export const deleteExistingProduct = async (
  req: Request<{ id: string }, void | ErrorResponse>,
  res: Response<void | ErrorResponse>,
) => {
  try {
    await deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    if (isKnownPrismaNotFound(error)) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    res.status(500).json({ message: "Failed to delete product" });
  }
};
