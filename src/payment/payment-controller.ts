import { Request, Response } from "express";
import { PaymentGateway } from "./payment-type";
import orderModel from "../order/order-model";
import { PaymentStatus } from "../order/order-types";

export class PaymentController {
  constructor(private paymentGW: PaymentGateway) {}

  handleWebhook = async (req: Request, res: Response) => {
    const webhookBody = req.body;

    if (webhookBody.type === "checkout.session.completed") {
      const verifiedSession = await this.paymentGW.getSession(
        webhookBody.data.object.id,
      );

      const isPaymentSuccess = verifiedSession.paymentStatus === "paid";

      const updatedOrder = await orderModel.findOneAndUpdate(
        {
          _id: verifiedSession.metaData.orderId,
        },
        {
          paymentStatus: isPaymentSuccess
            ? PaymentStatus.PAID
            : PaymentStatus.FAILED,
        },
        { new:true },
      );
    console.log("updatedOrder", updatedOrder)
    }
    return res.json({ success: true });
  };
}
