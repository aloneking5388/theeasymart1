import Banner from "@/models/Benners";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { connectDB } from "@/utils/ConnectDB";
import { NextRequest, NextResponse } from "next/server";

// Group products into chunks of 3
const formatProductsInRows = (products: any[]) => {
  const chunked: any[][] = [];
  for (let i = 0; i < products.length; i += 3) {
    chunked.push(products.slice(i, i + 3));
  }
  return chunked;
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const [
      banners,
      categories,
      newProducts,
      latestList,
      topRatedList,
      discountList,
    ] = await Promise.all([
      Banner.find({}),
      Category.find({}),
      Product.find({}).limit(10).sort({ createdAt: -1 }),
      Product.find({}).limit(9).sort({ createdAt: -1 }),
      Product.find({}).limit(9).sort({ rating: -1 }),
      Product.find({}).limit(9).sort({ discount: -1 }),
    ]);

    return NextResponse.json(
      {
        banners,
        categorys: categories,
        products: newProducts,
        latest_product: formatProductsInRows(latestList),
        topRated_product: formatProductsInRows(topRatedList),
        discount_product: formatProductsInRows(discountList),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Home API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
