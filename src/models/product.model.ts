import { type Brand, type Prisma } from "../../prisma/generated/client.ts";
import prisma from "@db/prisma";

export type CreateProductInput = {
  gearId: string;
  title: string;
  description: string;
  brand: Brand;
  category: string;
  price: Prisma.Decimal | string | number;
  images: string[];
  stock?: number;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export const listProducts = () =>
  prisma.product.findMany({ orderBy: { createdAt: "desc" } });

export const getProductById = (id: string) =>
  prisma.product.findUnique({ where: { id } });

export const getProductByGearId = (gearId: string) =>
  prisma.product.findUnique({ where: { gearId } });

export const createProduct = (data: CreateProductInput) =>
  prisma.product.create({ data });

export const updateProduct = (id: string, data: UpdateProductInput) =>
  prisma.product.update({ where: { id }, data });

export const deleteProduct = (id: string) =>
  prisma.product.delete({ where: { id } });
