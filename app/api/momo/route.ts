import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "MTN MoMo has been removed. Use Razorpay, Google Pay, Stripe, or PayPal instead.",
    },
    { status: 410 }
  );
}