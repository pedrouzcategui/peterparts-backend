import { Brand, Prisma } from "../../prisma/generated/client.ts";

export type ProductDTO = {
  id: string;
  gearId: string;
  title: string;
  description: string;
  brand: Brand;
  category: string;
  price: Prisma.Decimal | string | number;
  images: string[];
  stock: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProductDTO = {
  gearId: string;
  title: string;
  description: string;
  brand: Brand;
  category: string;
  price: string | number;
  images: string[];
  stock?: number;
};

export type UpdateProductDTO = Partial<CreateProductDTO>;

export type ErrorResponse = {
  message: string;
};
