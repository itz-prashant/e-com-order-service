import express from "express"
import { asyncWrapper } from "../utils"
import { PaymentController } from "./payment-controller"
import { StripeGW } from "./stripe"

const router = express.Router()

//Todo: move this instantciation to factory
const paymentGw = new StripeGW()
const paymentController = new PaymentController(paymentGw)

router.post("/webhook", asyncWrapper(paymentController.handleWebhook))

export default router