// app/api/products/[productId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { publicProduct } from "@/lib/publicProduct";
import Product from "@/models/Product";
import { connectDB } from "@/utils/ConnectDB";
import { verifyToken } from "@/lib/auth";
import { getTokenFromHeaders } from "@/utils/getToken";

export async function GET( req: NextRequest ) {
  try {
    const productId = req.nextUrl.pathname.split("/").pop(); // Extract productId from the URL

    await connectDB();
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const token = getTokenFromHeaders(req.headers);
    const user = token ? verifyToken(token) : null;
    const ownsProduct = user?.role === "seller" && String(product.sellerId) === user.id;
    return NextResponse.json({ product: ownsProduct ? product : publicProduct(product.toObject()) });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST( req: NextRequest) {
  try {
    await connectDB();
    
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = verifyToken(token);
    if (!user?.id || user.role !== "seller" || user.status !== "active") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();

     const productId = req.nextUrl.pathname.split("/").pop(); // Extract productId from the URL
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    if (!Types.ObjectId.isValid(productId)) return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
    const existing = await Product.findOne({ _id: productId, sellerId: user.id });
    if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const fields = existing.productType === "affiliate" ? ["category"] : ["name", "brand", "price", "stock", "discount", "description"];
    if (existing.productType === "affiliate" && Object.keys(body).some((key) => !["category", "productId"].includes(key))) return NextResponse.json({ error: "Imported affiliate details and the original URL cannot be changed. Only category is editable." }, { status: 400 });
    const changes = Object.fromEntries(fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
    const updatedProduct = await Product.findOneAndUpdate({ _id: productId, sellerId: user.id }, { $set: changes }, { new: true, runValidators: true });

    return NextResponse.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE( req: NextRequest) {
  try {
    await connectDB();
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = verifyToken(token);
    if (!user?.id || user.role !== "seller" || user.status !== "active") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = req.nextUrl.pathname.split("/").pop(); // Extract productId from the URL
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    if (!Types.ObjectId.isValid(productId)) return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
    const deleted = await Product.findOneAndDelete({ _id: productId, sellerId: user.id });
    if (!deleted) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    return NextResponse.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
