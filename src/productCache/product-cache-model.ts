import mongoose from "mongoose";
import { ProductPricingCache } from "../types";


const priceSchema = new mongoose.Schema({
  priceType: {
    type: String,
    enum: ["base", "additional"],
    required: true,
  },
  availableOptions: {
    type: Map,
    of: Number,
  },
});

const productCacheSchema = new mongoose.Schema<ProductPricingCache>({
  productId: {
    type: String,
    required: true,
  },
  priceConfiguration: {
    type: Map,
    of: priceSchema,
  },
});

export default mongoose.model("ProductPricingCache", productCacheSchema, "productCache")