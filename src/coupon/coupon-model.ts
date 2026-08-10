import mongoose from "mongoose";
import { Coupon } from "./coupon-types";

const CouponSchema = new mongoose.Schema<Coupon>({
    title:{
        type: String,
        required: true
    },
    code:{
        type: String,
        required: true
    },
    discount:{
        type: Number,
        required: true
    },
    tenantId:{
        type: Number,
        required: true
    },
    validUpTo:{
        type: Date,
        required: true
    }
}, {timestamps: true})

CouponSchema.index({tenantId:1, code: 1}, {unique:true})

export default mongoose.model("Coupon", CouponSchema)