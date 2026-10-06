import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import Product from "@/models/Product";
import AffiliateClick from "@/models/AffiliateClick";
import { connectDB } from "@/utils/ConnectDB";
import { validatePublicUrl } from "@/lib/safeRemote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Link previews and HEAD probes are not click events.
export async function HEAD() {
  return new NextResponse(null, { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.pathname.split("/").pop();
  if (!productId || !Types.ObjectId.isValid(productId)) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  try {
    await connectDB();
    const product = await Product.findById(productId);
    if (product?.productType !== "affiliate" || !product.affiliateLink) return NextResponse.json({ error: "Affiliate deal not found." }, { status: 404 });
    await validatePublicUrl(product.affiliateLink);
    await AffiliateClick.create({ productId: product._id, sellerId: product.sellerId });
    // Use the stored original string; do not rebuild a merchant URL or strip tracking parameters.
    return new NextResponse(null, { status: 302, headers: { Location: product.affiliateLink, "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "This merchant deal is currently unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
