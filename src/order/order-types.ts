import mongoose from "mongoose";
import { CartItem } from "../types";

export enum PaymentMode {
  CARD = "card",
  CASH = "cash",
}

export enum OrderStatus {
  RECEIVED = "received",
  CONFIRMED = "confirmed",
  PREPARED = "prepared",
  OUT_FOR_DELIVERY = "out_for_delivery",
  DELIVERED = "delivered",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
}

export interface Order {
  cart: CartItem[];
  customerId: mongoose.Types.ObjectId;
  total: number;
  discount: number;
  taxes: number;
  deliveryCahrges: number;
  address: string;
  tenantId: number;
  comment?: string;
  paymentMode: PaymentMode;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentId?: string;
}

export enum ROLES {
  ADMIN = "admin",
  CUSTOMER = "customer",
  MANAGER = "manager",
}

export enum OrderEvents {
  ORDER_CREATE = "ORDER_CREATE",
  PAYMENT_STATUS_UPDATE = "PAYMENT_STATUS_UPDATE",
  ORDER_STATUS_UPDATE = "ORDER_STATUS_UPDATE"

}
