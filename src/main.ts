import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { productRouter, authRouter } from "@routers/index";
import { checkDatabaseConnection } from "@db/index";

const app = express();
const port = 3000;

app.use(express.json());
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.use("/products", productRouter);
app.use("/auth", authRouter);

app.listen(port, async () => {
  await checkDatabaseConnection();
  console.log(`Example app listening on port ${port}`);
});
