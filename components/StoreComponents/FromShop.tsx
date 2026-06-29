"use client";

import { useState } from "react";
import Reviews from "./Reviews";
import Link from "next/link";
import Image from "next/image";
import Rating from "./Retings";
import { useAppSelector } from "@/store/hooks";
import FromShopSkeleton from "../Skeletons/FromShopSkeleton";

const FromShop = () => {
  const [state, setState] = useState<string>("reviews");
  const { product, moreProducts, loader } = useAppSelector(
    (state) => state.product
  );

  return (
    <div className="flex flex-wrap">
      <div className="lg:w-[72%] w-full">
        <div className="pr-4 max-md:pr-0">
          <div className="grid gap-1 grid-cols-2">
            <button
              onClick={() => setState("reviews")}
              className={`py-1 hover:text-white px-5 hover:bg-green-500 ${
                state === "reviews"
                  ? "bg-green-500 text-white"
                  : "bg-slate-200 text-slate-700"
              } rounded-sm`}
            >
              Reviews
            </button>
            <button
              onClick={() => setState("description")}
              className={`py-1 px-5 hover:text-white hover:bg-green-500 ${
                state === "description"
                  ? "bg-green-500 text-white"
                  : "bg-slate-200 text-slate-700"
              } rounded-sm`}
            >
              Description
            </button>
          </div>
          <div>
            {state === "reviews" ? (
              <Reviews product={product} />
            ) : (
              <div className="py-5 text-slate-600">
                <div
                  dangerouslySetInnerHTML={{
                    __html: product?.description || "",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="w-[28%] mt-8 max-md:w-full">
        {loader ? (
          <FromShopSkeleton />
        ) : (
          <div className="pl-4 max-md:pl-0">
            <div className="px-3 rounded-md py-2 font-semibold text-slate-600 bg-slate-200">
              <h2> From {product?.shopName}</h2>
            </div>
            <div className="grid justify-center items-center rounded-md grid-col-1 lg:grid-cols-2 gap-5 mt-3 border p-3">
              {moreProducts.map((p, i) => {
                return (
                  <Link
                    key={i}
                    href={`/products/${p.slug}`}
                    className="block max-md:w-[140px]"
                  >
                    <div className="relative">
                      <Image
                        className="aspect-square"
                        src={p.images[0]}
                        alt="product"
                        width={150}
                        height={150}
                      />
                      {p.discount !== 0 && (
                        <div className="flex justify-center items-center absolute text-white w-[38px] h-[38px] rounded-full bg-red-500 font-semibold text-xs left-2 top-2">
                          {p.discount}%
                        </div>
                      )}
                    </div>
                    <h2 className="text-slate-600 py-1">
                      {p.name?.slice(0, 40)}...
                    </h2>
                    <div className="flex gap-2">
                      <h2 className="text-slate-600">Price: </h2>
                      <span className="text-sm font-semibold">
                        ₹ {p.price}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2">
                        <Rating size="small" type="precise" rating={p.rating} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FromShop;
