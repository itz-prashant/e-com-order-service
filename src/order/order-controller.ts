import { Request, Response } from "express";
import {
  CartItem,
  ProductPricingCache,
  Topping,
  ToppingPriceCache,
} from "../types";
import productCacheModel from "../productCache/product-cache-model";
import toppingCacheModel from "../toppingCache.ts/toppingCacheModel";
import couponModel from "../coupon/coupon-model";
import orderModel from "./order-model";
import { OrderStatus, PaymentStatus } from "./order-types";

export class OrderController {
  create = async (req: Request, res: Response) => {
    const {
      cart,
      couponCode,
      tenantId,
      paymentMode,
      customerId,
      comment,
      address,
    } = req.body;

    const totalPrice = await this.calculateTotal(cart);

    let discountPercentage = 0;

    if (couponCode) {
      discountPercentage = await this.getDiscountPercentage(
        couponCode,
        tenantId,
      );
    }

    const discountAmount = Math.round((totalPrice * discountPercentage) / 100);

    const priceAfterDiscount = totalPrice - discountAmount;

    const TAXES_PERCENT = 5;

    const taxes = Math.round((priceAfterDiscount * TAXES_PERCENT) / 100);

    const DELIVERY_CHARGES = 50;

    const finalTotal = priceAfterDiscount + taxes + DELIVERY_CHARGES;

    // create an order

    const newOrder = await orderModel.create({
      cart,
      comment,
      address,
      customerId,
      deliveryCahrges: DELIVERY_CHARGES,
      discount: discountAmount,
      paymentMode,
      taxes,
      tenantId,
      total: finalTotal,
      orderStatus: OrderStatus.RECEIVED,
      paymentStatus: PaymentStatus.PENDING,
    });

    return res.json({ newOrder: newOrder });
  };

  private calculateTotal = async (cart: CartItem[]) => {
    const productIds = cart.map((item) => item._id);

    const productPricings = await productCacheModel.find({
      productId: {
        $in: productIds,
      },
    });

    const cartToppingIds = cart.reduce((acc, item) => {
      return [
        ...acc,
        ...item.chosenConfiguration.selectedToppings.map(
          (topping) => topping.id,
        ),
      ];
    }, []);

    const toppingPricings = await toppingCacheModel.find({
      toppingId: {
        $in: cartToppingIds,
      },
    });

    const totalPrice = cart.reduce((acc, curr) => {
      const cachedProductPrice = productPricings.find(
        (product) => product.productId == curr._id,
      );
      return (
        acc +
        curr.qty * this.getItemTotal(curr, cachedProductPrice, toppingPricings)
      );
    }, 0);

    return totalPrice;
  };

  private getItemTotal = (
    item: CartItem,
    cachedProductPrice: ProductPricingCache,
    toppingPricings: ToppingPriceCache[],
  ) => {
    const toppingsTotal = item.chosenConfiguration.selectedToppings.reduce(
      (acc, curr) => {
        return acc + this.getCurrentToppingPrice(curr, toppingPricings);
      },
      0,
    );

    const priceConfiguration =
      cachedProductPrice.priceConfiguration as unknown as Map<
        string,
        {
          priceType: string;
          availableOptions: Map<string, number>;
        }
      >;

    const productTotal = Object.entries(
      item.chosenConfiguration.priceConfiguration,
    ).reduce((acc, [key, value]) => {
      const priceConfig = priceConfiguration.get(key);

      if (!priceConfig) {
        throw new Error(
          `Price configuration "${key}" not found for product ${item._id}`,
        );
      }

      const price = priceConfig.availableOptions.get(String(value));

      if (price === undefined) {
        throw new Error(
          `Price option "${value}" not found under "${key}" for product ${item._id}`,
        );
      }

      return acc + price;
    }, 0);

    return productTotal + toppingsTotal;
  };

  private getCurrentToppingPrice = (
    topping: Topping,
    toppingPricings: ToppingPriceCache[],
  ) => {
    const currentTopping = toppingPricings.find(
      (item) => topping.id === item.toppingId,
    );

    if (!currentTopping) {
      return topping.price;
    }
    return currentTopping.price;
  };

  private getDiscountPercentage = async (
    couponCode: string,
    tenantId: number,
  ) => {
    const code = await couponModel.findOne({ code: couponCode, tenantId });

    if (!code) {
      return 0;
    }
    const currentDate = new Date();
    const couponDate = new Date(code.validUpTo);

    if (currentDate <= couponDate) {
      return code.discount;
    }
    return 0;
  };
}
