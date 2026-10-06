import { connectDB } from "@/utils/ConnectDB";
import Wishlist from "@/models/Wishlist";
import Product from "@/models/Product";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await connectDB();

  const userId = req.nextUrl.pathname.split("/").slice(-1)[0]; // Extract userId from the URL

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const wishlistItems = await Wishlist.find({ userId });
    const products = await Product.find({ _id: { $in: wishlistItems.map((item) => item.productId) } }).select("productType currency price").lean();
    const catalog = new Map(products.map((product: any) => [String(product._id), product]));
    const visibleItems = wishlistItems.map((item) => {
      const product: any = catalog.get(String(item.productId));
      return { ...item.toObject(), productType: product?.productType ?? "physical", currency: product?.currency, ...(product?.productType === "affiliate" ? { price: product.price } : {}) };
    });
    return NextResponse.json({ wishlistItems: visibleItems });
  } catch (error) {
    return NextResponse.json({ error: "Get wishlistItems failed" }, { status: 500 });
  }
}
