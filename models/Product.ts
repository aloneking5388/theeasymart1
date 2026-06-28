import mongoose, { Document, Schema, model, models } from "mongoose";

export interface IProduct extends Document {
  sellerId: Schema.Types.ObjectId;
  name: string;
  slug: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  discount: number;
  description: string;
  shopName: string;
  images: string[];
  rating?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Seller",
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    shopName: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Full-text index for search with weights
ProductSchema.index(
  {
    name: "text",
    category: "text",
    brand: "text",
    description: "text",
  },
  {
    weights: {
      name: 5,
      category: 4,
      brand: 3,
      description: 2,
    },
  }
);

// Prevent model overwrite on hot reload
const Product = models.Product || model<IProduct>("Product", ProductSchema);

export default Product;
