import { Schema, model, models } from "mongoose";

const AffiliateClickSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
  createdAt: { type: Date, default: Date.now, required: true },
});

export default models.AffiliateClick || model("AffiliateClick", AffiliateClickSchema);
