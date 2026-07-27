import { CustomerOrder } from "@/models/CustomerOrder";
import { connectDB } from "@/utils/ConnectDB";
import { getTokenFromHeaders } from "@/utils/getToken";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  getGatewayLabel,
  getPayPalAccessToken,
  parsePayPalCustomId,
  getRazorpayClient,
  getStripeClient,
  markOrderPaid,
  verifyRazorpaySignature,
} from "@/lib/paymentGateway";
import {
  supportedPaymentGateways,
  SupportedPaymentGateway,
} from "@/types/payment";

interface JwtPayload {
  id: string;
  role: string;
}

const isSupportedGateway = (value: string): value is SupportedPaymentGateway =>
  supportedPaymentGateways.includes(value as SupportedPaymentGateway);

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const tokenString = getTokenFromHeaders(req.headers);
    if (!tokenString) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = jwt.verify(
      tokenString,
      process.env.JWT_SECRET || "your_jwt_secret"
    ) as JwtPayload;

    if (token.role !== "user") {
      return NextResponse.json(
        { message: "Only customers can confirm payments" },
        { status: 403 }
      );
    }

    const {
      gateway,
      orderId,
      walletAmount = 0,
      sessionId,
      paypalOrderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = await req.json();

    if (!gateway || !isSupportedGateway(gateway) || !orderId) {
      return NextResponse.json(
        { message: "Invalid payment confirmation request" },
        { status: 400 }
      );
    }

    const order = await CustomerOrder.findOne({
      _id: orderId,
      customerId: token.id,
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const normalizedWalletAmount = Math.min(
      Math.max(0, Number(walletAmount) || 0),
      order.price
    );

    let paymentReference = `${gateway}_${orderId}`;

    if (gateway === "wallet") {
      if (normalizedWalletAmount < order.price) {
        return NextResponse.json(
          { message: "Wallet balance does not cover this order" },
          { status: 400 }
        );
      }
    }

    if (gateway === "stripe") {
      if (!sessionId) {
        return NextResponse.json(
          { message: "Missing Stripe checkout session" },
          { status: 400 }
        );
      }

      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return NextResponse.json(
          { message: "Stripe payment is not complete" },
          { status: 400 }
        );
      }

      if (session.metadata?.orderId !== orderId) {
        return NextResponse.json(
          { message: "Stripe payment does not match this order" },
          { status: 400 }
        );
      }

      paymentReference =
        (typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.id) || session.id;
    }

    if (gateway === "paypal") {
      if (!paypalOrderId) {
        return NextResponse.json(
          { message: "Missing PayPal order id" },
          { status: 400 }
        );
      }

      const { accessToken, baseUrl } = await getPayPalAccessToken();
      const response = await fetch(
        `${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.status !== "COMPLETED") {
        return NextResponse.json(
          { message: "PayPal payment capture failed" },
          { status: 400 }
        );
      }

      const paypalMapping = parsePayPalCustomId(
        data.purchase_units?.[0]?.custom_id
      );

      if (!paypalMapping || paypalMapping.orderId !== orderId) {
        return NextResponse.json(
          { message: "PayPal payment does not match this order" },
          { status: 400 }
        );
      }

      paymentReference = data.id;
    }

    if (gateway === "razorpay" || gateway === "gpay") {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return NextResponse.json(
          { message: "Missing Razorpay payment details" },
          { status: 400 }
        );
      }

      const isValidSignature = verifyRazorpaySignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      });

      if (!isValidSignature) {
        return NextResponse.json(
          { message: "Invalid Razorpay payment signature" },
          { status: 400 }
        );
      }

      const razorpay = getRazorpayClient();
      const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId);

      if (razorpayOrder.notes?.orderId !== orderId) {
        return NextResponse.json(
          { message: "Razorpay payment does not match this order" },
          { status: 400 }
        );
      }

      paymentReference = razorpayPaymentId;
    }

    const paymentResult = await markOrderPaid({
      orderId,
      customerId: token.id,
      gateway,
      paymentReference,
      walletAmount: normalizedWalletAmount,
    });

    const gatewayLabel = getGatewayLabel(gateway);

    return NextResponse.json(
      {
        message: paymentResult.orderAlreadyPaid
          ? `Order was already marked paid via ${gatewayLabel}`
          : `Payment completed successfully via ${gatewayLabel}`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unable to confirm payment" },
      { status: 500 }
    );
  }
}