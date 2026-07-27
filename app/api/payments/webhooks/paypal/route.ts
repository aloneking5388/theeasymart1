import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/utils/ConnectDB";
import {
  getPayPalAccessToken,
  markOrderPaid,
  parsePayPalCustomId,
  verifyPayPalWebhookSignature,
} from "@/lib/paymentGateway";

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const body = await req.json();

    const isValid = await verifyPayPalWebhookSignature({
      headers: req.headers,
      body,
    });

    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid PayPal webhook signature" },
        { status: 400 }
      );
    }

    if (
      body.event_type !== "CHECKOUT.ORDER.APPROVED" &&
      body.event_type !== "CHECKOUT.ORDER.COMPLETED"
    ) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const paypalOrderId = body.resource?.id;
    if (!paypalOrderId) {
      return NextResponse.json(
        { message: "Missing PayPal order id in webhook" },
        { status: 400 }
      );
    }

    const { accessToken, baseUrl } = await getPayPalAccessToken();

    if (body.event_type === "CHECKOUT.ORDER.APPROVED") {
      await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
    }

    const orderResponse = await fetch(
      `${baseUrl}/v2/checkout/orders/${paypalOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const orderData = await orderResponse.json();

    const purchaseUnit = orderData.purchase_units?.[0];
    const paypalMapping = parsePayPalCustomId(purchaseUnit?.custom_id);
    const captureId =
      purchaseUnit?.payments?.captures?.[0]?.id ||
      body.resource?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
      paypalOrderId;

    if (!paypalMapping) {
      return NextResponse.json(
        { message: "PayPal webhook is missing custom order mapping" },
        { status: 400 }
      );
    }

    await markOrderPaid({
      orderId: paypalMapping.orderId,
      customerId: paypalMapping.customerId,
      gateway: "paypal",
      paymentReference: captureId,
      walletAmount: paypalMapping.walletAmount,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "PayPal webhook failed" },
      { status: 500 }
    );
  }
}