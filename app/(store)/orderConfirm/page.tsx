"use client";
import { clearOrderDetails } from "@/store/Order/orderSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import FadeLoader from "react-spinners/FadeLoader";

const Page = () => {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { token } = useAppSelector((state) => state.auth);
  const [loader, setLoader] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const status = searchParams.get("status");
  const gateway = searchParams.get("gateway");
  const orderId = searchParams.get("orderId");
  const sessionId = searchParams.get("session_id");
  const paypalOrderId = searchParams.get("token");
  const walletAmount = Number(searchParams.get("walletAmount") || 0);

  useEffect(() => {
    let cancelled = false;

    const confirmRedirectPayment = async () => {
      if (status === "success") {
        setSuccessMessage(searchParams.get("message") || "Payment completed successfully.");
        setLoader(false);
        dispatch(clearOrderDetails());
        return;
      }

      if (status === "error" || status === "cancelled") {
        setErrorMessage(
          searchParams.get("message") ||
            (status === "cancelled"
              ? "Payment was cancelled before completion."
              : "Payment failed.")
        );
        setLoader(false);
        return;
      }

      if (!gateway || !orderId || !token) {
        setErrorMessage("Missing payment confirmation details.");
        setLoader(false);
        return;
      }

      const payload: Record<string, unknown> = {
        gateway,
        orderId,
        walletAmount,
      };

      if (gateway === "stripe") {
        payload.sessionId = sessionId;
      }

      if (gateway === "paypal") {
        payload.paypalOrderId = paypalOrderId;
      }

      try {
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
          throw new Error(data.message || "Payment confirmation failed.");
        }

        if (!cancelled) {
          setSuccessMessage(data.message || "Payment completed successfully.");
          dispatch(clearOrderDetails());
        }
      } catch (error: any) {
        if (!cancelled) {
          setErrorMessage(error.message || "Payment confirmation failed.");
        }
      } finally {
        if (!cancelled) {
          setLoader(false);
        }
      }
    };

    confirmRedirectPayment();

    return () => {
      cancelled = true;
    };
  }, [dispatch, gateway, orderId, paypalOrderId, searchParams, sessionId, status, token, walletAmount]);

  return (
    <div className='w-screen h-screen flex justify-center items-center flex-col gap-4'>
      {loader ? (
        <FadeLoader  />
      ) : errorMessage ? (
        <>
          <Image src="/images/error.png" alt="Error" width={100} height={100} />
          <h1 className='text-red-500 text-2xl font-semibold'>Error: {errorMessage}</h1>
          <Link href="/dashboard" className='bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors'>
            Go to User Dashboard
          </Link>
        </>
      ) : successMessage ? (
        <>
          <Image src="/images/success.png" alt="Success" width={100} height={100} />
          <h1 className='text-green-500 text-2xl font-semibold'>Success: {successMessage}</h1>
          <Link href="/dashboard" className='bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors'>
            Go to User Dashboard
          </Link>
        </>
      ) : null}
    </div>
  );
}

export default Page;
