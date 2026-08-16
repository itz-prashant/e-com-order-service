import express, { Request, Response } from "express";
import { globalErrorHandler } from "./common/middleware/globalErrorHandler";
import cookieParser from "cookie-parser";
import customerRouter from "./customer/customer-router"
import couponRouter from "./coupon/coupon-router"
import orderRouter from "./order/order-router"

const app = express();
app.use(cookieParser());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from order service service!" });
});

app.use("/customer", customerRouter)
app.use("/coupons", couponRouter)
app.use("/orders", orderRouter)

app.use(globalErrorHandler);

export default app;
