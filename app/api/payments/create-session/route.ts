import { CustomerOrder } from "@/models/CustomerOrder";
import { connectDB } from "@/utils/ConnectDB";
import { getTokenFromHeaders } from "@/utils/getToken";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  externalPaymentGateways,
  ExternalPaymentGateway,
} from "@/types/payment";
import {
  buildPayPalCustomId,
  getAppBaseUrl,
  getPayPalAccessToken,
  getRazorpayClient,
  getStripeClient,
  paymentCurrency,
  toMinorUnit,
} from "@/lib/paymentGateway";

interface JwtPayload {
  id: string;
  role: string;
  name?: string;
  email?: string;
}

const isExternalGateway = (value: string): value is ExternalPaymentGateway =>
  externalPaymentGateways.includes(value as ExternalPaymentGateway);

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
        { message: "Only customers can start payments" },
        { status: 403 }
      );
    }

    const { gateway, orderId, amount, walletAmount = 0 } = await req.json();

    if (!gateway || !isExternalGateway(gateway) || !orderId) {
      return NextResponse.json(
        { message: "Invalid payment request" },
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

    if (order.payment_status === "paid") {
      return NextResponse.json(
        { message: "This order has already been paid" },
        { status: 409 }
      );
    }

    const sanitizedWalletAmount = Math.max(0, Number(walletAmount) || 0);
    const remainingAmount = Math.max(order.price - sanitizedWalletAmount, 0);

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { message: "Wallet already covers the full order amount" },
        { status: 400 }
      );
    }

    if (Math.abs(remainingAmount - Number(amount)) > 1) {
      return NextResponse.json(
        { message: "Payment amount does not match the order balance" },
        { status: 400 }
      );
    }

    const appBaseUrl = getAppBaseUrl(req.url);

    if (gateway === "stripe") {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${appBaseUrl}/orderConfirm?gateway=stripe&orderId=${orderId}&walletAmount=${sanitizedWalletAmount}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appBaseUrl}/orderConfirm?status=cancelled&gateway=stripe&orderId=${orderId}`,
        metadata: {
          orderId,
          customerId: token.id,
          walletAmount: String(sanitizedWalletAmount),
          gateway,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: paymentCurrency.toLowerCase(),
              product_data: {
                name: `The Easy Mart order ${orderId}`,
              },
              unit_amount: toMinorUnit(remainingAmount),
            },
          },
        ],
      });

      return NextResponse.json({ checkoutUrl: session.url }, { status: 200 });
    }

    if (gateway === "paypal") {
      const { accessToken, baseUrl } = await getPayPalAccessToken();
      const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              custom_id: buildPayPalCustomId({
                orderId,
                customerId: token.id,
                walletAmount: sanitizedWalletAmount,
              }),
              amount: {
                currency_code: paymentCurrency,
                value: remainingAmount.toFixed(2),
              },
              description: `The Easy Mart order ${orderId}`,
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                return_url: `${appBaseUrl}/orderConfirm?gateway=paypal&orderId=${orderId}&walletAmount=${sanitizedWalletAmount}`,
                cancel_url: `${appBaseUrl}/orderConfirm?status=cancelled&gateway=paypal&orderId=${orderId}`,
              },
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create PayPal order");
      }

      const approvalLink = data.links?.find(
        (link: { rel: string; href: string }) => link.rel === "payer-action"
      );

      if (!approvalLink?.href) {
        throw new Error("PayPal approval link was not returned");
      }

      return NextResponse.json(
        { checkoutUrl: approvalLink.href },
        { status: 200 }
      );
    }

    const razorpay = getRazorpayClient();
    const razorpayOrder = await razorpay.orders.create({
      amount: toMinorUnit(remainingAmount),
      currency: paymentCurrency,
      receipt: `order_${String(orderId).slice(-10)}`,
      notes: {
        orderId,
        customerId: token.id,
        gateway,
        walletAmount: String(sanitizedWalletAmount),
      },
    });

    return NextResponse.json(
      {
        gateway,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        razorpayOrderId: razorpayOrder.id,
        keyId:
          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Unable to start payment" },
      { status: 500 }
    );
  }
}