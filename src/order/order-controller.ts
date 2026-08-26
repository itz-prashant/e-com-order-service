import { NextFunction, Request, Response } from "express";
import { Request as AuthRequest } from "express-jwt";
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
import {
  OrderEvents,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
  ROLES,
} from "./order-types";
import idempotencyModel from "../idempotency/idempotency-model";
import mongoose from "mongoose";
import createHttpError from "http-errors";
import { PaymentGateway } from "../payment/payment-type";
import { MessageBroker } from "../types/broker";
import customerModel from "../customer/customer-model";

export class OrderController {
  constructor(
    private paymentGW: PaymentGateway,
    private broker: MessageBroker,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    const {
      cart,
      couponCode,
      tenantId,
      paymentMode,
      customerId,
      comment,
      address,
    } = req.body;

    const idemPotencyKey = req.headers["idempotency-key"];

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

    const idempotency = await idempotencyModel.findOne({ key: idemPotencyKey });

    let newOrder = idempotency ? [idempotency.response] : [];

    if (!idempotency) {
      const session = await mongoose.startSession();
      await session.startTransaction();

      try {
        // create an order
        newOrder = await orderModel.create(
          [
            {
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
            },
          ],
          { session },
        );

        await idempotencyModel.create(
          [{ key: idemPotencyKey, response: newOrder[0] }],
          { session },
        );

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        await session.endSession();

        return next(createHttpError(500, error));
      } finally {
        await session.endSession();
      }
    }
    const brokerMessage = {
      event_type: OrderEvents.ORDER_CREATE,
      data: newOrder[0],
    };
    if (paymentMode === PaymentMode.CARD) {
      // Payment processing

      const session = await this.paymentGW.createSession({
        amount: finalTotal,
        orderId: newOrder[0]._id.toString(),
        tenantId: tenantId,
        currency: "inr",
        idempotencyKey: idemPotencyKey as string,
      });

      await this.broker.sendMessgae(
        "order",
        JSON.stringify(brokerMessage),
        newOrder[0]._id.toString(),
      );

      return res.json({ paymentUrl: session.paymentUrl });
    }
    await this.broker.sendMessgae(
      "order",
      JSON.stringify(brokerMessage),
      newOrder[0]._id.toString(),
    );

    return res.json({ paymentUrl: null });
  };

  getMine = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.auth.sub;

    if (!userId) {
      return next(createHttpError(400, "No userId found"));
    }

    const customer = await customerModel.findOne({ userId });
    if (!customer) {
      return next(createHttpError(400, "No customer found"));
    }

    const orders = await orderModel.find(
      { customerId: customer.id },
      { cart: 0 },
    );

    return res.json(orders);
  };

  getSingle = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { sub: userId, role, tenant: tenantId } = req.auth;

    const orderId = req.params.orderId;
    const fields = req.query.fields
      ? req.query.fields.toString().split(",")
      : [];

    if (!userId) {
      return next(createHttpError(400, "No userId found"));
    }

    const projection = fields.reduce(
      (acc, field) => {
        acc[field] = 1;
        return acc;
      },
      { customerId: 1, tenantId: 1 },
    );

    const order = await orderModel
      .findOne({ _id: orderId }, projection)
      .populate("customerId")
      .exec();

    if (!order) {
      return next(createHttpError(400, "Order does not exist"));
    }

    if (role === "admin") {
      return res.json(order);
    }

    const myRestaurantOrder = order.tenantId === tenantId;

    if (role === "manager" && myRestaurantOrder) {
      return res.json(order);
    }

    if (role === "customer") {
      const customer = await customerModel.findOne({ userId });
      if (!customer) {
        return next(createHttpError(400, "No customer found"));
      }
      if (customer._id.toString() === order.customerId._id.toString()) {
        return res.json(order);
      }
    }

    return next(createHttpError(403, "Operation not permitted"));
  };

  getAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { role, tenant: userTenantId } = req.auth;

    const tenantId = req.query.tenantId;

    if (role === ROLES.CUSTOMER) {
      return next(createHttpError(403, "Not allowed"));
    }

    if (role === ROLES.ADMIN) {
      const filter = {};
      if (tenantId) {
        filter["tenanId"] = Number(tenantId);
      }
      // TODO: very important add pagination
      const orders = await orderModel
        .find(filter, {}, { sort: { createdAt: -1 } })
        .populate("customerId")
        .exec();

      return res.json(orders);
    }

    if (role === ROLES.MANAGER) {
      const orders = await orderModel
        .find({ tenantId: userTenantId }, {}, { sort: { createdAt: -1 } })
        .populate("customerId")
        .exec();
      return res.json(orders);
    }
    return next(createHttpError(403, "Not allowed"));
  };

  changeStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    const { role, tenant: tenanId } = req.auth;
    const orderId = req.params.orderId;

    if (role === ROLES.CUSTOMER) {
      return next(createHttpError(403, "Not allowed"));
    }

    if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
      const order = await orderModel.findOne({ _id: orderId });
      if (!order) {
        return next(createHttpError(400, "Order not found"));
      }

      const isMyRestaurantOrder = order.tenantId === tenanId;

      if (role === ROLES.MANAGER && !isMyRestaurantOrder) {
        return next(createHttpError(403, "Not allowed"));
      }

      const updatedOrder = await orderModel.findOneAndUpdate(
        { _id: orderId },
        { orderStatus: req.body.status },
        { new: true },
      );

      const brokerMessage = {
        event_type: OrderEvents.ORDER_STATUS_UPDATE,
        data: updatedOrder,
      };
      await this.broker.sendMessgae(
        "order",
        JSON.stringify(brokerMessage),
        updatedOrder._id.toString(),
      );

      return res.json({ _id: updatedOrder.id });
    }
    return next(createHttpError(403, "Not allowed"));
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
