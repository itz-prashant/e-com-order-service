import { Request } from "express";
import mongoose from "mongoose";

export type AuthCookie = {
  accessToken: string;
};

export interface AuthRequest extends Request {
  auth: {
    sub: string;
    role: string;
    id?: string;
    tenant: string;
  };
}

export interface PriceConfiguration {
    priceType: {
      type: "base" | "additional";
      availableOptions: {
        [key: string]: number;
      };
    };
  };

export interface ProductPricingCache {
  productId: string;
  priceConfiguration: PriceConfiguration
}

export interface ProductMessage {
  id: string
  event_type: ProductEvents;
  data: {
    id: string;
    priceConfiguration: PriceConfiguration;
  };
}

export interface ToppingPriceCache {
  _id: mongoose.Types.ObjectId
  toppingId: string;
  price: number;
  tenantId: string;
}
export interface ToppingMessage {
  id: string;
  price: number;
  tenantId: string;
}

export type ProductAttribute = {
  name: string;
  value: string | undefined;
};

export interface ProductPriceConfiguration {
  [key: string]: {
    priceType: "base" | "additional";
    availableOptions: {
      [key: string]: number;
    };
  };
}

export type Product = {
  _id: string;
  name: string;
  description: string;
  priceConfiguration: ProductPriceConfiguration;
  image: string;
};

export type Topping = {
  id: string;
  name: string;
  price: number;
  image: string;
};

export enum ProductEvents {
  PRODUCT_CREATE = "PRODUCT_CREATE",
  PRODUCT_UPDATE = "PRODUCT_UPDATE",
  PRODUCT_DELETE = "PRODUCT_DELETE",
}

export interface CartItem 
  extends Pick<Product, "_id" | "name" | "image" | "priceConfiguration">{
    chosenConfiguration:{
      priceConfiguration:{
        [key: string]: number;
      };
      selectedToppings: Topping[]
    };
    qty: number
  }
