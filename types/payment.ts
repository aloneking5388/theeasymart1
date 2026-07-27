export const supportedPaymentGateways = [
  "wallet",
  "paypal",
  "stripe",
  "razorpay",
  "gpay",
] as const;

export type SupportedPaymentGateway =
  (typeof supportedPaymentGateways)[number];

export const externalPaymentGateways = [
  "paypal",
  "stripe",
  "razorpay",
  "gpay",
] as const;

export type ExternalPaymentGateway =
  (typeof externalPaymentGateways)[number];