import { Response } from "express";
import { Request } from "express-jwt";
import customerModel from "./customer-model";

export class CustomerController {
  getCustomer = async (req: Request, res: Response) => {
    const { sub: userId, firstName, lastName, email } = req.auth;

    const customer = await customerModel.findOne({ userId });

    if (!customer) {
      const newCustomer = await customerModel.create({
        userId,
        firstName,
        lastName,
        email,
        address: [],
      });

      return res.json(newCustomer);
    }

    res.json({ customer });
  };

  addAddress = async (req: Request, res: Response) => {
    const { sub: userId } = req.auth;

    const customer = await customerModel.findOneAndUpdate(
      {
        _id: req.params.id,
        userId,
      },
      {
        $push: {
          address: {
            text: req.body.addresses,
            isDefault: false,
          },
        },
      },
      {new: true}
    );
      return res.json(customer)
  };
}
