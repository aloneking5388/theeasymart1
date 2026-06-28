// app/api/momo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, requestToPay } from "@/lib/momo";

export async function POST(req: NextRequest) {
  try {
    const { amount, phone, externalId } = await req.json();

    const token = await getAccessToken();
    const result = await requestToPay({ amount, phone, externalId, token });

    return NextResponse.json(
      { success: true, referenceId: result.uuid },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
