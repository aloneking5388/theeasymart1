import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  profileImage?: string;
  shippingInfo: {
    address?: string;
    post: string;
    province?: string;
    city?: string;
    area?: string;
  };
  role: "user" | "seller" | "admin";
  createdAt: Date;
}

const UserSchema: Schema<IUser> = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true, // Allows for unique phone numbers but can be null
  },
  shippingInfo: {
    name: {
      type: String,
    },
    address: {
      type: String,
    },
    phone: {
      type: String,
    },
    post: {
      type: String,
    },
    province: {
      type: String,
    },
    city: {
      type: String,
    },
    area: {
      type: String,
    },
  },
  profileImage: {
    type: String,
  },
  role: {
    type: String,
    enum: ["user", "seller", "admin"],
    default: "user",
  },
  createdAt: { type: Date, default: Date.now },
},
{ timestamps: true });

UserSchema.index(
  { name: "text", email: "text" },
  { weights: { name: 5, email: 4 } }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
