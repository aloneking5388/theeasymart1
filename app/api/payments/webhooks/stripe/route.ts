import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/utils/ConnectDB";
import { getStripeClient, markOrderPaid } from "@/lib/paymentGateway";

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { message: "Missing Stripe webhook secret or signature" },
        { status: 400 }
      );
    }

    const payload = await req.text();
    const stripe = getStripeClient();

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    const customerId = session.metadata?.customerId;
    const walletAmount = Number(session.metadata?.walletAmount || 0);

    if (!orderId || !customerId) {
      return NextResponse.json(
        { message: "Stripe session metadata is incomplete" },
        { status: 400 }
      );
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { message: "Stripe session is not paid" },
        { status: 400 }
      );
    }

    await markOrderPaid({
      orderId,
      customerId,
      gateway: "stripe",
      paymentReference:
        (typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.id) || session.id,
      walletAmount,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Stripe webhook failed" },
      { status: 500 }
    );
  }
}