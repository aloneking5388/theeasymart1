"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getWalletOverview } from "@/store/wallet/walletSlice";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaPaypal, FaGooglePay, FaStripeS } from "react-icons/fa";
import { SiRazorpay } from "react-icons/si";

type PaymentGateway = "wallet" | "paypal" | "stripe" | "razorpay" | "gpay";
type ExternalPaymentGateway = Exclude<PaymentGateway, "wallet">;

type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

const paymentMethods: Array<{
  id: ExternalPaymentGateway;
  name: string;
  badge: string;
  accent: string;
  icon: React.ReactNode;
  helper: string;
}> = [
  {
    id: "razorpay",
    name: "Razorpay",
    badge: "RZP",
    accent: "from-blue-500 to-indigo-600",
    icon: <SiRazorpay className="text-xl" />,
    helper: "Cards, UPI, netbanking, and wallets for India.",
  },
  {
    id: "gpay",
    name: "Google Pay (UPI)",
    badge: "GPay",
    accent: "from-emerald-500 to-teal-600",
    icon: <FaGooglePay className="text-2xl" />,
    helper: "Focused UPI flow inside Razorpay checkout.",
  },
  {
    id: "stripe",
    name: "Stripe",
    badge: "STR",
    accent: "from-violet-500 to-fuchsia-600",
    icon: <FaStripeS className="text-xl" />,
    helper: "Global card checkout with Stripe-hosted payment page.",
  },
  {
    id: "paypal",
    name: "PayPal",
    badge: "PP",
    accent: "from-sky-500 to-blue-700",
    icon: <FaPaypal className="text-xl" />,
    helper: "Redirect approval flow for PayPal buyers.",
  },
];

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const PaymentOption = ({
  id,
  name,
  badge,
  accent,
  icon,
  helper,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  badge: string;
  accent: string;
  icon: React.ReactNode;
  helper: string;
  selected: boolean;
  onSelect: () => void;
}) => (
  <div
    onClick={onSelect}
    className={`min-h-32 flex-1 min-w-55 max-md:my-2 cursor-pointer rounded-2xl border px-6 py-7 transition ${
      selected
        ? "border-orange-500 bg-white shadow-lg shadow-orange-100"
        : "border-slate-200 bg-slate-50 hover:border-slate-300"
    }`}
  >
    <div className="flex h-full flex-col justify-between gap-5">
      <div className="flex items-center justify-between gap-4">
        <span
          className={`inline-flex w-fit rounded-full bg-linear-to-r px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white ${accent}`}
        >
          {badge}
        </span>
        <span className="text-slate-500">{icon}</span>
      </div>
      <div>
        <span className="block text-base font-semibold text-slate-700 max-md:text-sm">
          {name}
        </span>
        <span className="mt-2 block text-sm text-slate-500">{helper}</span>
      </div>
    </div>
  </div>
);

const PayNowButton = ({
  disabled,
  onClick,
  loader,
}: {
  disabled: boolean;
  onClick: () => Promise<void>;
  loader?: boolean;
}) => (
  <div className="w-full px-4 py-8 rounded-md bg-white shadow-sm">
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-10 py-1.5 rounded-sm text-white ${
        disabled
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-orange-500 hover:shadow-orange-500/20 hover:shadow-lg"
      }`}
    >
      {loader ? (
        <Loader2 className="animate-spin h-5 w-5 inline-block" />
      ) : (
        "Pay Now"
      )}
    </button>
  </div>
);

const PaymentPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { orderId, items, totalPrice } = useAppSelector((state) => state.order);
  const { token, userInfo } = useAppSelector((state) => state.auth);
  const { walletBalance, loader } = useAppSelector((state) => state.wallet);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentGateway>("razorpay");
  const [processing, setProcessing] = useState(false);
  const selectedGateway = paymentMethods.find(
    (method) => method.id === paymentMethod,
  );

  const walletUsed = Math.min(walletBalance, totalPrice);
  const payByGateway = totalPrice - walletUsed;

  useEffect(() => {
    dispatch(getWalletOverview());
  }, [dispatch]);

  const createPaymentSession = async () => {
    const response = await fetch("/api/payments/create-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        gateway: paymentMethod,
        orderId,
        amount: payByGateway,
        walletAmount: walletUsed,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to start payment");
    }

    return data;
  };

  const confirmPayment = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/payments/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to confirm payment");
    }

    return data;
  };

  const openRazorpayCheckout = async (session: {
    keyId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    gateway: PaymentGateway;
  }) => {
    const sdkLoaded = await loadRazorpayScript();
    if (!sdkLoaded || !window.Razorpay) {
      throw new Error("Razorpay checkout failed to load");
    }

    const instance = new window.Razorpay({
      key: session.keyId,
      amount: session.amount,
      currency: session.currency,
      name: "The Easy Mart",
      description:
        session.gateway === "gpay"
          ? "Google Pay / UPI checkout"
          : "Razorpay checkout",
      order_id: session.razorpayOrderId,
      prefill: {
        name: userInfo?.name,
        email: userInfo?.email,
      },
      theme: {
        color: session.gateway === "gpay" ? "#059669" : "#f97316",
      },
      config:
        session.gateway === "gpay"
          ? {
              display: {
                blocks: {
                  upi: {
                    name: "Google Pay / UPI",
                    instruments: [
                      {
                        method: "upi",
                      },
                    ],
                  },
                },
                sequence: ["block.upi"],
                preferences: {
                  show_default_blocks: false,
                },
              },
            }
          : undefined,
      handler: async (response: RazorpaySuccessPayload) => {
        try {
          const result = await confirmPayment({
            gateway: session.gateway,
            orderId,
            walletAmount: walletUsed,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          router.push(
            `/orderConfirm?status=success&message=${encodeURIComponent(result.message)}`,
          );
        } catch (error: any) {
          router.push(
            `/orderConfirm?status=error&message=${encodeURIComponent(
              error.message || "Payment confirmation failed",
            )}`,
          );
        }
      },
      modal: {
        ondismiss: () => {
          setProcessing(false);
        },
      },
    });

    instance.open();
  };

  const handlePayNow = async () => {
    if (!orderId) {
      toast.error("No pending order found for payment");
      router.push("/cart");
      return;
    }

    if (!token) {
      toast.error("Please login to continue payment");
      router.push("/login");
      return;
    }

    setProcessing(true);

    try {
      if (payByGateway <= 0) {
        const result = await confirmPayment({
          gateway: "wallet",
          orderId,
          walletAmount: walletUsed,
        });

        router.push(
          `/orderConfirm?status=success&message=${encodeURIComponent(result.message)}`,
        );
        return;
      }

      const session = await createPaymentSession();

      if (paymentMethod === "stripe" || paymentMethod === "paypal") {
        window.location.href = session.checkoutUrl;
        return;
      }

      await openRazorpayCheckout(session);
    } catch (error: any) {
      toast.error(error.message || "Unable to process payment");
      setProcessing(false);
    }
  };

  return (
    <section className="bg-[radial-gradient(circle_at_top,#fff3e8,#f4f4f5_55%,#e5e7eb)]">
      <div className="max-w-360 mx-auto lg:px-12 px-10 py-16 mt-4">
        <div className="flex flex-wrap max-md:flex-col-reverse">
          {/* Left: Payment Options */}
          <div className="w-7/12 max-md:my-2 max-md:w-full pr-2 max-md:pr-0">
            <div className="bg-white p-6 mb-4 rounded-3xl shadow-sm text-slate-600 border border-orange-100">
              <div className="flex items-start justify-between gap-6 max-md:flex-col">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-orange-500 font-semibold">
                    Checkout
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-slate-800">
                    Finish your payment
                  </h1>
                  <p className="mt-2 text-sm text-slate-500 max-w-xl">
                    Wallet balance is applied first. The remaining amount can be
                    completed with a secure Indian-friendly gateway.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-5 py-4 min-w-64 border border-slate-100">
                  <p>
                    <strong>Wallet Balance:</strong> ₹ {walletBalance}
                  </p>
                  <p>Used from Wallet: ₹ {walletUsed}</p>
                  <p>Remaining via gateway: ₹ {payByGateway}</p>
                </div>
              </div>
              {payByGateway > 0 ? (
                <div className="mt-5 rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3">
                  <p>
                    Remaining ₹ {payByGateway} will be paid using{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedGateway?.name}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-green-600 font-semibold">
                  Full payment covered by wallet.
                </p>
              )}
            </div>

            {payByGateway > 0 ? (
              <div className="flex flex-wrap gap-4">
                {paymentMethods.map((method) => (
                  <PaymentOption
                    key={method.id}
                    id={method.id}
                    name={method.name}
                    badge={method.badge}
                    accent={method.accent}
                    icon={method.icon}
                    helper={method.helper}
                    selected={paymentMethod === method.id}
                    onSelect={() => setPaymentMethod(method.id)}
                  />
                ))}
              </div>
            ) : null}

            {selectedGateway && payByGateway > 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
                <p className="font-semibold text-slate-800">Selected gateway</p>
                <p className="mt-1">{selectedGateway.name}</p>
                <p className="mt-2 text-slate-500">{selectedGateway.helper}</p>
              </div>
            ) : null}

            <PayNowButton
              disabled={processing || loader}
              onClick={handlePayNow}
              loader={processing || loader}
            />
          </div>

          {/* Right: Order Summary */}
          <div className="w-5/12 max-md:w-full pl-2 max-md:pl-0 md:mb-0">
            <div className="bg-white shadow rounded-3xl p-6 text-slate-600 flex flex-col gap-4 border border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800">
                Order Summary
              </h2>
              <div className="flex justify-between items-center">
                <span>{items} items and shipping fee included</span>
                <span>₹ {totalPrice}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Wallet used</span>
                <span>₹ {walletUsed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Gateway charge</span>
                <span>₹ {payByGateway}</span>
              </div>
              <div className="flex justify-between items-center font-semibold">
                <span>Total Amount</span>
                <span className="text-lg text-orange-500">₹ {totalPrice}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Secure checkout powered by verified providers. Google Pay is
                served through UPI on Razorpay for Indian web payments.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentPage;
