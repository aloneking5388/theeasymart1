import jwt from "jsonwebtoken";
import type { AffiliateMetadata } from "./affiliateMetadata";

export interface AffiliateImport extends AffiliateMetadata { sellerId: string; originalAffiliateUrl: string }
export function signAffiliateImport(data: AffiliateImport): string {
  if (!process.env.JWT_SECRET) throw new Error("Import signing is unavailable");
  return jwt.sign(data, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h", audience: "affiliate-import" });
}
export function verifyAffiliateImport(token: string, sellerId: string, url: string): AffiliateImport {
  const data = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ["HS256"], audience: "affiliate-import" }) as AffiliateImport;
  if (data.sellerId !== sellerId || data.originalAffiliateUrl !== url) throw new Error("Invalid import receipt");
  return data;
}
