import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getTokenFromHeaders } from "@/utils/getToken";
import { safeRemoteFetch, RemoteFetchError } from "@/lib/safeRemote";
import { extractAffiliateMetadata } from "@/lib/affiliateMetadata";
import { signAffiliateImport, signAffiliateFallback } from "@/lib/affiliateImport";

import { affiliateProvider } from "@/lib/affiliateProvider";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const token = getTokenFromHeaders(req.headers);
  if (!token) return NextResponse.json({ error: "Token is missing." }, { status: 401 });
  const user = verifyToken(token);
  if (!user?.id || user.role !== "seller" || user.status !== "active") return NextResponse.json({ error: "Unauthorized seller." }, { status: 403 });
  let originalAffiliateUrl = "";
  try {
    const { url } = await req.json();
    if (typeof url !== "string" || !url.trim() || url.length > 4096) return NextResponse.json({ error: "Invalid affiliate URL." }, { status: 400 });
    originalAffiliateUrl = url.trim();
    const response = await safeRemoteFetch(originalAffiliateUrl, { kind: "html" });
    let metadata;
    try { metadata = extractAffiliateMetadata(response.body.toString("utf8"), response.finalUrl); }
    catch { throw new RemoteFetchError("PRODUCT_FETCH_UNAVAILABLE", "EasyMart could not retrieve product metadata from this website. Try another product link.", true); }
    const importToken = signAffiliateImport({ ...metadata, sellerId: user.id, originalAffiliateUrl });
    return NextResponse.json({ ...metadata, originalAffiliateUrl, importToken });
  } catch (error) {
    const remote = error instanceof RemoteFetchError;
    const message = remote ? error.message : "EasyMart could not retrieve product information. Please try again.";
    let fallback: { fallbackToken?: string; originalAffiliateUrl?: string; provider?: 'amazon' | 'other' } = {};
    if (remote && error.code === "PRODUCT_FETCH_UNAVAILABLE" && error.manualFallbackAllowed) {
      try {
        fallback = { fallbackToken: signAffiliateFallback(user.id, originalAffiliateUrl), originalAffiliateUrl, provider: affiliateProvider(originalAffiliateUrl) };
      } catch { /* Without signing, retain the controlled error and offer retry only. */ }
    }
    return NextResponse.json({ ...fallback, success: false, code: remote ? error.code : "PRODUCT_FETCH_UNAVAILABLE", message, error: message }, { status: remote && error.code === "INVALID_AFFILIATE_URL" ? 400 : 422 });
  }
}
