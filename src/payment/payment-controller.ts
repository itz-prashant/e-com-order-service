import { Request, Response } from "express";
import { PaymentGateway } from "./payment-type";
import orderModel from "../order/order-model";
import { OrderEvents, PaymentStatus } from "../order/order-types";
import { MessageBroker } from "../types/broker";
import customerModel from "../customer/customer-model";

export class PaymentController {
  constructor(
    private paymentGW: PaymentGateway,
    private broker: MessageBroker,
  ) {}

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
        { new: true },
      );
      const customer = await customerModel.findOne({
              _id: updatedOrder[0].customerId,
            });
      const brokerMessage = {
        event_type: OrderEvents.PAYMENT_STATUS_UPDATE,
        data:  {...updatedOrder.toObject(), customerId: customer},
      };
      await this.broker.sendMessgae(
        "order",
        JSON.stringify(brokerMessage),
        updatedOrder._id.toString(),
      );

      // console.log("updatedOrder", updatedOrder)
    }
    return res.json({ success: true });
  };
}
