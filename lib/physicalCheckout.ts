import { Types } from "mongoose";
import Product from "@/models/Product";

export const affiliateCheckoutMessage = "Affiliate products cannot enter the EasyMart cart or checkout. Use View Deal to buy from the merchant.";

// Trust current database product types, never client-supplied productType or cached snapshots.
export async function assertPhysicalProducts(items: Array<Record<string, any>>) {
  if (!Array.isArray(items) || !items.length) throw new Error("No checkout products supplied.");
  const ids = items.map((item) => String(item?._id ?? item?.id ?? item?.productId ?? ""));
  if (ids.some((id) => !Types.ObjectId.isValid(id))) throw new Error("Invalid checkout product.");
  const products = await Product.find({ _id: { $in: ids } }).select("productType").lean();
  if (products.length !== new Set(ids).size) throw new Error("A checkout product is no longer available.");
  if (products.some((product: any) => product.productType === "affiliate")) throw new Error(affiliateCheckoutMessage);
}
