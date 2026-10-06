import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import { connectDB } from "@/utils/ConnectDB";
import { verifyToken } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary"; // Assuming you have a utility function for Cloudinary upload
import { generateSlug } from "@/utils/generateSlug";
import { verifyAffiliateImport } from "@/lib/affiliateImport";
import { safeRemoteFetch, validatePublicUrl } from "@/lib/safeRemote";
import { publicProduct } from "@/lib/publicProduct";
import Seller from "@/models/Seller";
import { getTokenFromHeaders } from "@/utils/getToken";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Get token from headers
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return NextResponse.json({ error: "Token is missing." }, { status: 401 });
    }

    // Verify token and check user role/status
    const user = verifyToken(token);
    if (!user?.id || user.role !== "seller" || user.status !== "active") {
      return NextResponse.json(
        { error: "Unauthorized seller." },
        { status: 403 },
      );
    }

    const seller = await Seller.findById(user.id);
    const shopInfo = seller?.shopInfo;

    if (!shopInfo) {
      return NextResponse.json(
        { error: "Shop information not found." },
        { status: 404 },
      );
    }

    // Parse form data
    const formData = await req.formData();

    const productType = formData.get("productType") || "physical";
    if (productType !== "physical" && productType !== "affiliate") return NextResponse.json({ error: "Invalid product type." }, { status: 400 });
    const isAffiliate = productType === "affiliate";
    let currency: string | null = null;
    let name = formData.get("name") as string;
    let price = parseFloat(formData.get("price") as string);
    const category = formData.get("category") as string;
    let brand = formData.get("brand") as string;
    let stock = parseInt(formData.get("stock") as string);
    let discount = parseFloat(formData.get("discount") as string);
    let description = formData.get("description") as string;
    const affiliateLink = formData.get("affiliateLink") as string | null;
    const costPriceRaw = formData.get("costPrice") as string | null;
    const marginRaw = formData.get("margin") as string | null;
    const costPrice = costPriceRaw ? parseFloat(costPriceRaw) : undefined;
    const margin = marginRaw ? parseFloat(marginRaw) : undefined;

    let importedImages: string[] | null = null;
    if (isAffiliate) {
      try {
        if (!affiliateLink || typeof affiliateLink !== "string") throw new Error();
        await validatePublicUrl(affiliateLink);
        const receipt = verifyAffiliateImport(String(formData.get("importToken") || ""), user.id, affiliateLink);
        name = receipt.name || name;
        description = receipt.description || description;
        price = receipt.price ?? price;
        brand = receipt.brand || brand;
        currency = receipt.currency;
        importedImages = receipt.images.length ? receipt.images : null;
        stock = 0; discount = 0;
      } catch {
        return NextResponse.json({ error: "Fetch this affiliate URL again before publishing. The import may have expired or the URL is invalid." }, { status: 400 });
      }
      if (!description || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: "The merchant returned incomplete information. Supply the missing description and price." }, { status: 400 });
    }

    // Validate required fields
    if (!name || isNaN(price) || !category || !brand || isNaN(stock)) {
      return NextResponse.json(
        { error: "Missing or invalid fields." },
        { status: 400 },
      );
    }

    const images: string[] = [];

    // Handle multiple image uploads
    const imageFiles = importedImages ? [] : formData.getAll("images") as File[];
    const imageUrls = importedImages ?? formData.getAll("imageUrls") as string[];
    if (imageFiles.length === 0 && imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required." },
        { status: 400 },
      );
    }

    for (const file of imageFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = (await uploadToCloudinary(buffer)) as {
        secure_url: string;
      };

      if (!uploaded?.secure_url) {
        return NextResponse.json(
          { error: "Image upload failed." },
          { status: 500 },
        );
      }

      images.push(uploaded.secure_url);
    }

    // Re-upload affiliate-fetched images so they aren't hotlinked from the source site
    for (const url of imageUrls) {
      try {
        const fetched = await safeRemoteFetch(url, { kind: "image" });
        const buffer = fetched.body;
        const uploaded = (await uploadToCloudinary(buffer)) as {
          secure_url: string;
        };
        if (uploaded?.secure_url) {
          images.push(uploaded.secure_url);
        }
      } catch (err) {
        console.error("Failed to import affiliate image:", url, err);
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required." },
        { status: 400 },
      );
    }

    // Create product in the
    const slug = generateSlug(name);
    const product = await Product.create({
      productType,
      currency: isAffiliate ? currency : undefined,
      name,
      slug,
      price,
      category,
      brand,
      stock,
      discount,
      description,
      images,
      shopName: shopInfo.shopName,
      sellerId: user.id,
      affiliateLink: affiliateLink || undefined,
      costPrice: isAffiliate ? undefined : costPrice,
      margin: isAffiliate ? undefined : margin,
    });

    // Return success response
    return NextResponse.json({
      message: "Product added successfully",
      product,
    });
  } catch (error: any) {
    console.error("Error adding product:", error);
    return NextResponse.json(
      { error: "Product could not be saved. Check the required fields and try again." },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page")) || 1;
  const perPage = Number(searchParams.get("parPage")) || 10;
  const searchValue = searchParams.get("searchValue") || "";

  let query: any = {};
  let projection: any = {};
  let sort: any = { createdAt: -1 };

  // Use text search if searchValue is provided
  if (searchValue) {
    query = { $text: { $search: searchValue } };
    projection = { score: { $meta: "textScore" } };
    sort = { score: { $meta: "textScore" } };
  }

  const totalProduct = await Product.countDocuments(query);

  const products = await Product.find(query, projection)
    .sort(sort)
    .skip((page - 1) * perPage)
    .limit(perPage);

  const formattedProducts = products.map((product) => ({
    ...publicProduct(product.toObject()),
    id: product._id.toString(),
  }));

  return NextResponse.json({ products: formattedProducts, totalProduct });
}
