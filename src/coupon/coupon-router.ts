import express from "express"
import authenticate from "../common/middleware/authenticate"
import { asyncWrapper } from "../utils"
import { CouponConytoller } from "./coupon-controller"

const router = express.Router()

const couponController = new CouponConytoller()

router.post("/", authenticate, asyncWrapper(couponController.create))
router.post("/verify", authenticate, asyncWrapper(couponController.verify))


export default router