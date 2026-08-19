import config from "config";
import Stripe from "stripe";
import {
  GatewayPaymentStatus,
  PaymentGateway,
  PaymentOptions,
  PaymentSession,
} from "./payment-type";

export class StripeGW implements PaymentGateway {
  private stripe: Stripe;
  constructor() {
    this.stripe = new Stripe(config.get("stripe.secret_key"));
  }

  async createSession(options: PaymentOptions): Promise<PaymentSession> {
    const session = await this.stripe.checkout.sessions.create(
      {
        metadata: {
          orderId: options.orderId,
        },
        line_items: [
          {
            price_data: {
              unit_amount: options.amount * 100,
              product_data: {
                name: "Online Pizza order",
                description: "Total amount to be paid",
                images: ["https://placehold.jp/150x150.png"],
              },
              currency: options.currency || "inr",
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${config.get("frontend.client")}/payment?success=true&orderId=${options.orderId}`,
        cancel_url: `${config.get("frontend.client")}/payment?success=false&orderId=${options.orderId}`,
      },
      { idempotencyKey: options.idempotencyKey },
    );
    
    return {
      id: session.id,
      paymentUrl: session.url,
      paymentStatus: this.mapStripePaymentStatus(session.payment_status),
    };
  }

  private mapStripePaymentStatus = (
    status: Stripe.Checkout.Session.PaymentStatus,
  ): GatewayPaymentStatus => {
    switch (status) {
      case "no_payment_required":
        return "no_payment_required";

      case "paid":
        return "paid";

      case "unpaid":
        return "unpaid";

      default:
        return "unpaid";
    }
  };

  async getSession(id: string) {
    return null;
  }
}
