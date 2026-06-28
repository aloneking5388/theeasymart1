"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deductWalletAmount, getWalletOverview, walletMessageClear } from "@/store/wallet/walletSlice";
import { formatPrice } from "@/utils/formatPrice";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const paymentMethods = [
  { id: "wallet", name: "MyWallet", icon: "/images/payment/wallet.png" },
  { id: "momopay", name: "MomoPay", icon: "/images/payment/momo-pay.png" },
  { id: "airtelpay", name: "Airtel", icon: "/images/payment/airtelpay.jpg" },
  { id: "paypal", name: "Paypal", icon: "/images/payment/paypal.png" },
];

const PaymentOption = ({
  id,
  name,
  icon,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
  onSelect: () => void;
}) => (
  <div
    onClick={onSelect}
    className={`w-[23%] max-md:my-2 border-r cursor-pointer rounded-md py-8 px-12 ${
      selected ? "bg-white border border-orange-500" : "bg-slate-100"
    }`}
  >
    <div className="flex flex-col gap-[3px] justify-center items-center">
      <Image src={icon} alt={name} width={50} height={50} />
      <span className="text-slate-600 max-md:text-sm">{name}</span>
    </div>
  </div>
);

const PayNowButton = ({
  disabled,
  onClick,
  loader,
}: {
  disabled: boolean;
  onClick: () => void;
  loader?: boolean;
}) => (
  <div className="w-full px-4 py-8 rounded-md bg-white shadow-sm">
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-10 py-[6px] rounded-sm text-white ${
        disabled
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-orange-500 hover:shadow-orange-500/20 hover:shadow-lg"
      }`}
    >
      {loader ? <Loader2 className="animate-spin h-5 w-5 inline-block" /> : "Pay Now"}
      {disabled && <span className="ml-2 text-sm">Please select a payment method</span>}
    </button>
  </div>
);

const PaymentPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { orderId, items, totalPrice } = useAppSelector((state) => state.order);
  const { walletBalance, loader } = useAppSelector((state) => state.wallet);
  const [paymentMethod, setPaymentMethod] = useState("wallet");

  const walletUsed = Math.min(walletBalance, totalPrice);
  const payByGateway = totalPrice - walletUsed;

  useEffect(() => {
  dispatch(getWalletOverview())
  },[dispatch]);
  
  const handlePayNow = () => {
    // 1. Deduct from wallet
    if (walletUsed > 0) {
      dispatch(deductWalletAmount({
        payAmount: walletUsed,
        orderId,
      }))
      router.push("/orderConfirm");
      // TODO: Call API to deduct wallet balance
    }

    // 2. Pay remaining via selected gateway
    if (payByGateway > 0) {
      switch (paymentMethod) {
        case "momopay":
          console.log(`Paying ₹ ${payByGateway}k via MomoPay`);
          break;
        case "airtelpay":
          console.log(`Paying ₹ ${payByGateway}k via Airtel Money`);
          break;
        case "paypal":
          console.log(`Paying ₹ ${payByGateway}k via PayPal`);
          break;
        default:
          console.warn("Please select a payment method for the remaining amount");
          break;
      }
    } else {
      console.log("Full payment done using Wallet");
    }
  };

  return (
    <section className="bg-[#eeeeee]">
      <div className="max-w-[1440px] mx-auto lg:px-12 px-10 py-16 mt-4">
        <div className="flex flex-wrap max-md:flex-col-reverse">
          {/* Left: Payment Options */}
          <div className="w-7/12 max-md:my-2 max-md:w-full pr-2 max-md:pr-0">
            <div className="bg-white p-4 mb-4 rounded-md shadow text-slate-600">
              <p><strong>Wallet Balance:</strong> ₹ {formatPrice(walletBalance)}</p>
              <p>Used from Wallet: ₹ {formatPrice(walletUsed)}</p>
              {payByGateway > 0 ? (
                <p>
                  Remaining ₹ {formatPrice(payByGateway)} will be paid using{" "}
                  {paymentMethod !== "wallet" ? paymentMethod : "another method"}
                </p>
              ) : (
                <p className="text-green-600 font-semibold">Full payment covered by wallet.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              {paymentMethods.map((method) => (
                <PaymentOption
                  key={method.id}
                  id={method.id}
                  name={method.name}
                  icon={method.icon}
                  selected={paymentMethod === method.id}
                  onSelect={() => setPaymentMethod(method.id)}
                />
              ))}
            </div>

            <PayNowButton
              disabled={payByGateway > 0 && paymentMethod === "wallet"}
              onClick={handlePayNow}
              loader={loader}
            />
          </div>

          {/* Right: Order Summary */}
          <div className="w-5/12 max-md:w-full pl-2 max-md:pl-0 md:mb-0">
            <div className="bg-white shadow rounded-md p-5 text-slate-600 flex flex-col gap-3">
              <h2>Order Summary</h2>
              <div className="flex justify-between items-center">
                <span>{items} items and shipping fee included</span>
                <span>₹ {formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between items-center font-semibold">
                <span>Total Amount</span>
                <span className="text-lg text-orange-500">
                  ₹ {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentPage;
