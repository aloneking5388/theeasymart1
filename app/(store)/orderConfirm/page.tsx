"use client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getWalletOverview } from "@/store/wallet/walletSlice";
import { formatPrice } from "@/utils/formatPrice";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import FadeLoader from "react-spinners/FadeLoader";

const Page = () => {
  const dispatch = useAppDispatch();
  const { walletBalance, successMessage, errorMessage, loader } = useAppSelector((state) => state.wallet);

  useEffect(() => {
    dispatch(getWalletOverview());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      console.log("Success:", successMessage);
    }
    if (errorMessage) {
      console.error("Error:", errorMessage);
    }
  }, [successMessage, errorMessage]);

  return (
    <div className='w-screen h-screen flex justify-center items-center flex-col gap-4'>
      {loader ? (
        <FadeLoader  />
      ) : errorMessage ? (
        <>
          <Image src="/images/error.png" alt="Error" width={100} height={100} />
          <h1 className='text-red-500 text-2xl font-semibold'>Error: {errorMessage}</h1>
          <h2 className="text-slate-800 text-xl">walletBalance: {formatPrice(walletBalance)}</h2>
          <Link href="/dashboard" className='bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors'>
            Go to User Dashboard
          </Link>
        </>
      ) : successMessage ? (
        <>
          <Image src="/images/success.png" alt="Success" width={100} height={100} />
          <h1 className='text-green-500 text-2xl font-semibold'>Success: {successMessage}</h1>
          <h2 className="text-slate-800 text-xl">walletBalance: {formatPrice(walletBalance)}</h2>
          <Link href="/dashboard" className='bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors'>
            Go to User Dashboard
          </Link>
        </>
      ) : null}
    </div>
  );
}

export default Page;
