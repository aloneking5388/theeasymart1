import * as cheerio from "cheerio";

export interface AffiliateMetadata { name: string; description: string; price: number | null; currency: string | null; brand: string; images: string[] }

export function parsePrice(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  let value = String(raw).replace(/[^0-9.,]/g, "");
  if (value.includes(",") && value.includes(".")) {
    value = value.lastIndexOf(",") > value.lastIndexOf(".") ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
  } else if (value.includes(",")) value = /,\d{3}(,|$)/.test(value) ? value.replace(/,/g, "") : value.replace(",", ".");
  const number = Number(value);
  return value && Number.isFinite(number) && number >= 0 ? number : null;
}

export function extractAffiliateMetadata(html: string, baseUrl: string): AffiliateMetadata {
  const $ = cheerio.load(html);
  const text = (value: unknown, max = 20000) => typeof value === "string" ? cheerio.load(value).text().trim().slice(0, max) : "";
  const meta = (key: string) => $(`meta[property="${key}"],meta[name="${key}"]`).first().attr("content");
  const products: Record<string, any>[] = [];
  const walk = (value: any, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 20) return;
    if (Array.isArray(value)) { value.forEach((item) => walk(item, depth + 1)); return; }
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    if (types.some((type: unknown) => typeof type === "string" && /(^|[/#])Product$/.test(type))) products.push(value);
    if (value["@graph"]) walk(value["@graph"], depth + 1);
    if (value.mainEntity) walk(value.mainEntity, depth + 1);
  };
  $('script[type="application/ld+json"]').each((_, el) => { try { walk(JSON.parse($(el).text())); } catch { /* malformed metadata is unavailable */ } });
  const product = products.find((p) => text(p.name)) ?? products[0];
  const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
  const images = new Set<string>();
  const addImage = (raw: any) => {
    const value = typeof raw === "string" ? raw : raw?.url ?? raw?.contentUrl;
    if (typeof value !== "string") return;
    try { const url = new URL(value, baseUrl); if (["http:", "https:"].includes(url.protocol)) images.add(url.toString()); } catch { /* invalid image */ }
  };
  if (product?.image) (Array.isArray(product.image) ? product.image : [product.image]).forEach(addImage);
  $('meta[property="og:image"],meta[name="og:image"]').each((_, el) => addImage($(el).attr("content")));
  if (!images.size) addImage(meta("twitter:image"));
  const twitterPrice = /price/i.test(meta("twitter:label1") ?? "") ? meta("twitter:data1") : undefined;
  const price = parsePrice(offer?.price ?? offer?.priceSpecification?.price) ?? parsePrice(meta("product:price:amount") ?? meta("og:price:amount")) ?? parsePrice(twitterPrice);
  const rawCurrency = text(offer?.priceCurrency ?? offer?.priceSpecification?.priceCurrency ?? meta("product:price:currency") ?? meta("og:price:currency"), 3).toUpperCase();
  const name = text(product?.name || meta("og:title") || meta("twitter:title") || $("title").first().text(), 500);
  // A generic title alone (including a challenge/login page) is not evidence of a product.
  const productEvidence = !!product || meta("og:type") === "product" || price !== null;
  if (!productEvidence || !name || /captcha|access denied|robot check|just a moment|sign in|verify you are human/i.test(name)) throw new Error("PRODUCT_FETCH_UNAVAILABLE");
  return {
    name,
    description: text(product?.description || meta("og:description") || meta("twitter:description") || meta("description")),
    price,
    currency: /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : null,
    brand: text(typeof product?.brand === "string" ? product.brand : product?.brand?.name || meta("product:brand"), 200),
    images: [...images].slice(0, 8),
  };
}
