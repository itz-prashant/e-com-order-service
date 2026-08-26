import express from "express"
import authenticate from "../common/middleware/authenticate"
import { asyncWrapper } from "../utils"
import { OrderController } from "./order-controller"
import { StripeGW } from "../payment/stripe"
import { createMessageBroker } from "../common/factories/brokerFactory"

const router = express.Router()

const paymentGW = new StripeGW()
const broker = createMessageBroker()
const orderController = new OrderController(paymentGW, broker)

router.post("/", authenticate, asyncWrapper(orderController.create))
router.get("/mine", authenticate, asyncWrapper(orderController.getMine))
router.get("/:orderId", authenticate, asyncWrapper(orderController.getSingle))
router.get("/", authenticate, asyncWrapper(orderController.getAll))
router.patch("/change-status/:orderId", authenticate, asyncWrapper(orderController.changeStatus))

export default router