import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/utils/ConnectDB";
import {
  markOrderPaid,
  verifyRazorpayWebhookSignature,
} from "@/lib/paymentGateway";

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json(
        { message: "Missing Razorpay signature" },
        { status: 400 }
      );
    }

    const payload = await req.text();

    if (
      !verifyRazorpayWebhookSignature({
        payload,
        signature,
      })
    ) {
      return NextResponse.json(
        { message: "Invalid Razorpay webhook signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(payload) as {
      event: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            notes?: {
              orderId?: string;
              customerId?: string;
              gateway?: string;
              walletAmount?: string;
            };
            method?: string;
          };
        };
      };
    };

    if (event.event !== "payment.captured") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const payment = event.payload?.payment?.entity;
    const orderId = payment?.notes?.orderId;
    const customerId = payment?.notes?.customerId;
    const gateway = payment?.notes?.gateway === "gpay" ? "gpay" : "razorpay";
    const walletAmount = Number(payment?.notes?.walletAmount || 0);

    if (!orderId || !customerId || !payment?.id) {
      return NextResponse.json(
        { message: "Razorpay webhook payload is incomplete" },
        { status: 400 }
      );
    }

    await markOrderPaid({
      orderId,
      customerId,
      gateway,
      paymentReference: payment.id,
      walletAmount,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Razorpay webhook failed" },
      { status: 500 }
    );
  }
}