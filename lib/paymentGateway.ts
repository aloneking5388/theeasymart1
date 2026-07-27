import crypto from "crypto";
import AuthorOrder from "@/models/AuthOrder";
import { CustomerOrder } from "@/models/CustomerOrder";
import CustomerWallet from "@/models/CustomerWallet";
import WalletTransaction from "@/models/WalletTransaction";
import Stripe from "stripe";
import Razorpay from "razorpay";
import { SupportedPaymentGateway } from "@/types/payment";

export const paymentCurrency = process.env.PAYMENT_CURRENCY || "INR";

export const getAppBaseUrl = (requestUrl: string) =>
  process.env.NEXT_PUBLIC_APP_URL || new URL(requestUrl).origin;

export const toMinorUnit = (amount: number) => Math.round(amount * 100);

export const getGatewayLabel = (gateway: SupportedPaymentGateway) => {
  switch (gateway) {
    case "wallet":
      return "wallet";
    case "paypal":
      return "PayPal";
    case "stripe":
      return "Stripe";
    case "razorpay":
      return "Razorpay";
    case "gpay":
      return "Google Pay";
  }
};

export const buildPayPalCustomId = ({
  orderId,
  customerId,
  walletAmount,
}: {
  orderId: string;
  customerId: string;
  walletAmount: number;
}) => `${orderId}|${customerId}|${walletAmount}`;

export const parsePayPalCustomId = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const [orderId, customerId, walletAmount] = value.split("|");
  if (!orderId || !customerId) {
    return null;
  }

  return {
    orderId,
    customerId,
    walletAmount: Number(walletAmount || 0),
  };
};

export const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
  });
};

export const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Missing Razorpay keys");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

export const verifyRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Missing RAZORPAY_KEY_SECRET");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
};

export const verifyRazorpayWebhookSignature = ({
  payload,
  signature,
}: {
  payload: string;
  signature: string;
}) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("Missing RAZORPAY_WEBHOOK_SECRET");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return expectedSignature === signature;
};

export const getPayPalAccessToken = async () => {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error("Missing PayPal credentials");
  }

  const baseUrl =
    process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to authenticate with PayPal");
  }

  const data = await response.json();
  return { accessToken: data.access_token as string, baseUrl };
};

export const verifyPayPalWebhookSignature = async ({
  headers,
  body,
}: {
  headers: Headers;
  body: Record<string, unknown>;
}) => {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    throw new Error("Missing PAYPAL_WEBHOOK_ID");
  }

  const { accessToken, baseUrl } = await getPayPalAccessToken();

  const response = await fetch(
    `${baseUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: body,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Unable to verify PayPal webhook signature");
  }

  const data = await response.json();
  return data.verification_status === "SUCCESS";
};

export const markOrderPaid = async ({
  orderId,
  customerId,
  gateway,
  paymentReference,
  walletAmount,
}: {
  orderId: string;
  customerId: string;
  gateway: SupportedPaymentGateway;
  paymentReference: string;
  walletAmount: number;
}) => {
  const order = await CustomerOrder.findOne({ _id: orderId, customerId });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.payment_status === "paid") {
    return { orderAlreadyPaid: true };
  }

  if (walletAmount > 0) {
    const existingWalletDebit = await WalletTransaction.findOne({
      orderId,
      customerId,
      type: "debit",
      source: "purchase",
      status: "success",
    });

    if (!existingWalletDebit) {
      const wallet = await CustomerWallet.findOne({ customerId });
      if (!wallet || wallet.amount < walletAmount) {
        throw new Error("Insufficient wallet balance for this payment");
      }

      wallet.amount -= walletAmount;
      await wallet.save();

      await WalletTransaction.create({
        customerId,
        type: "debit",
        amount: walletAmount,
        purpose: `Applied wallet balance to order ${orderId}`,
        orderId,
        source: "purchase",
        status: "success",
      });
    }
  }

  await CustomerOrder.findByIdAndUpdate(orderId, {
    $set: {
      payment_status: "paid",
      payment_method: gateway,
      payment_reference: paymentReference,
      wallet_amount: walletAmount,
    },
  });

  await AuthorOrder.updateMany(
    { orderId },
    {
      $set: {
        payment_status: "paid",
        payment_method: gateway,
        payment_reference: paymentReference,
        wallet_amount: walletAmount,
      },
    }
  );

  return { orderAlreadyPaid: false };
};