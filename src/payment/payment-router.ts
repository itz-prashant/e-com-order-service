import express from "express"
import { asyncWrapper } from "../utils"
import { PaymentController } from "./payment-controller"
import { StripeGW } from "./stripe"
import { createMessageBroker } from "../common/factories/brokerFactory"

const router = express.Router()

//Todo: move this instantciation to factory
const paymentGw = new StripeGW()
const broker = createMessageBroker()
const paymentController = new PaymentController(paymentGw, broker)

router.post("/webhook", asyncWrapper(paymentController.handleWebhook))

export default router