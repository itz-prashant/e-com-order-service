import { Request, Response } from "express";
import couponModel from "./coupon-model";

export class CouponConytoller {
    create = async (req:Request, res:Response)=>{
        const {title, code, discount, tenantId, validUpTo} = req.body

        const coupon = await couponModel.create({
            title,
            code,
            discount,
            validUpTo,
            tenantId
        })

        return res.json(coupon)
    }
}