import { Router, type Request, type Response } from "express";

const router = Router();

// GET /products - List all products
router.get("/", (req: Request, res: Response) => {
  res.json({ message: "List all products" });
});

// GET /products/:id - Get a product by ID
router.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ message: `Get product with ID ${id}` });
});

// POST /products - Create a new product
router.post("/", (req: Request, res: Response) => {
  res.json({ message: "Create a new product" });
});

// PUT /products/:id - Update a product by ID
router.put("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ message: `Update product with ID ${id}` });
});

// DELETE /products/:id - Delete a product by ID
router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ message: `Delete product with ID ${id}` });
});

export default router;
