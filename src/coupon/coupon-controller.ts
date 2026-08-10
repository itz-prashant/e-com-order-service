import { NextFunction, Request, Response } from "express";
import couponModel from "./coupon-model";
import createHttpError from "http-errors";

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

    verify = async (req:Request, res:Response, next:NextFunction)=>{
        const {code, tenantId} = req.body

        const coupon = await couponModel.findOne({code, tenantId})

        if(!coupon){
            const error = createHttpError(400, "Coupon does not exist")
            return next(error)
        }

        // validate expiry

        const currentDate = new Date()
        const couponDate = new Date(coupon.validUpTo)

        if(currentDate <= couponDate){
            return res.json({valid:true, discount: coupon.discount})
        }

        res.json({valid:false, discount:0})
    }
}