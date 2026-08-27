import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { verifyToken } from "@/lib/auth";
import { getTokenFromHeaders } from "@/utils/getToken";

interface FetchedProductDetails {
  name: string;
  description: string;
  price: number | null;
  images: string[];
  currency: string | null;
}

function parsePrice(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.,]/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
  const value = parseFloat(cleaned.replace(",", "."));
  return isNaN(value) ? null : value;
}

function resolveUrl(base: string, maybeRelative: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return NextResponse.json({ error: "Token is missing." }, { status: 401 });
    }
    const user = verifyToken(token);
    if (!user || user.role !== "seller" || user.status !== "active") {
      return NextResponse.json({ error: "Unauthorized seller." }, { status: 403 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Affiliate link is required." }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not reach the affiliate link." },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const finalUrl = response.url || parsedUrl.toString();

    const meta = (name: string) =>
      $(`meta[property="${name}"]`).attr("content") ||
      $(`meta[name="${name}"]`).attr("content") ||
      undefined;

    let name = meta("og:title") || meta("twitter:title") || $("title").first().text().trim();
    let description =
      meta("og:description") ||
      meta("twitter:description") ||
      meta("description") ||
      "";
    let price = parsePrice(
      meta("product:price:amount") ||
        meta("og:price:amount") ||
        meta("twitter:data1")
    );
    let currency =
      meta("product:price:currency") || meta("og:price:currency") || null;

    const images = new Set<string>();
    const ogImage = meta("og:image") || meta("twitter:image");
    if (ogImage) images.add(resolveUrl(finalUrl, ogImage));
    $('meta[property="og:image"]').each((_, el) => {
      const content = $(el).attr("content");
      if (content) images.add(resolveUrl(finalUrl, content));
    });

    // Fallback to JSON-LD Product schema for missing fields
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).contents().text());
        const candidates = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of candidates) {
          const product = item?.["@type"] === "Product" ? item : null;
          if (!product) continue;
          if (!name && product.name) name = product.name;
          if (!description && product.description) description = product.description;
          if (product.image) {
            const imgs = Array.isArray(product.image) ? product.image : [product.image];
            imgs.forEach((img: string) => images.add(resolveUrl(finalUrl, img)));
          }
          const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
          if (offer) {
            if (price === null && offer.price) price = parsePrice(String(offer.price));
            if (!currency && offer.priceCurrency) currency = offer.priceCurrency;
          }
        }
      } catch {
        // ignore malformed JSON-LD blocks
      }
    });

    if (!name && images.size === 0 && price === null) {
      return NextResponse.json(
        { error: "Could not extract product details from this link." },
        { status: 422 }
      );
    }

    const result: FetchedProductDetails = {
      name: name || "",
      description: description || "",
      price,
      images: Array.from(images).slice(0, 8),
      currency,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching affiliate link:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch product details." },
      { status: 500 }
    );
  }
}
