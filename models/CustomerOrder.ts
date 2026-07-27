import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface ICustomerOrder extends Document {
  customerId: mongoose.Types.ObjectId;
  products: Schema.Types.Mixed[]; 
  price: number;
  payment_status: string;
  payment_method?: string | null;
  payment_reference?: string | null;
  wallet_amount?: number;
  shippingInfo: Record<string, any>; 
  delivery_status: string;
  date: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const customerOrderSchema = new Schema<ICustomerOrder>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    products: {
      type: [Schema.Types.Mixed],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    payment_status: {
      type: String,
      required: true,
    },
    payment_method: {
      type: String,
      default: null,
    },
    payment_reference: {
      type: String,
      default: null,
    },
    wallet_amount: {
      type: Number,
      default: 0,
    },
    shippingInfo: {
      type: Schema.Types.Mixed,
      required: true,
    },
    delivery_status: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CustomerOrder =
  models.CustomerOrder || model<ICustomerOrder>('CustomerOrder', customerOrderSchema);
