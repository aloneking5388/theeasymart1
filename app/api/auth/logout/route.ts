import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") || "User";

  const message = `${role.charAt(0).toUpperCase() + role.slice(1)} logout successful!`;

  const response = NextResponse.json({
    success: true,
    message,
  });

  response.cookies.set("token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
