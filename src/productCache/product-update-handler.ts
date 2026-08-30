import { ProductMessage } from "../types";
import productCacheModel from "./product-cache-model";

export const handleProductUpdate = async (value: string) => {
  const product: ProductMessage = JSON.parse(value);

  return await productCacheModel.updateOne(
    {
      productId: product.data.id,
    },
    {
      $set: {
        priceConfiguration: product.data.priceConfiguration,
      },
    },
    { upsert: true },
  );
};
