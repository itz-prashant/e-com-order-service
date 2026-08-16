import { ToppingMessage } from "../types";
import toppingCacheModel from "./toppingCacheModel";

export const handleToppingUpdate = async (value: string) => {
  const topping: ToppingMessage = JSON.parse(value);

  return await toppingCacheModel.updateOne(
    {
      toppingId: topping.id,
    },
    {
      $set: {
        price: topping.price,
        tenantId: topping.tenantId,
      },
    },
    { upsert: true },
  );
};
