// ✅ Safe for middleware.ts (Edge runtime) — verifies the signature via Web Crypto
import { jwtVerify } from "jose";
import { DecodedToken } from "@/types/auth";

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
};

export const decodeToken = async (
  token: string,
): Promise<DecodedToken | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const decoded = payload as unknown as DecodedToken;

    if (!decoded.exp || Date.now() > decoded.exp * 1000) {
      console.error("Token expired");
      return null;
    }

    return decoded;
  } catch (error: any) {
    console.error("Token verification failed:", error.message);
    return null;
  }
};
