"use client";
import { formatPrice } from "@/utils/formatPrice";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import Rating from "./Retings";
import { Pagination } from "swiper/modules";
import { useAppSelector } from "@/store/hooks";
import RelatedProductSkeleton from "../Skeletons/RelatedProductSkeleton";

const RelatedProduct = () => {
  const { relatedProducts, loader } = useAppSelector((state) => state.product);

  return (
    <div>
      {loader ? (
        <RelatedProductSkeleton />
      ) : (
        <>
          <div>
            {relatedProducts.length > 0 && (
              <Swiper
                slidesPerView="auto"
                breakpoints={{
                  1280: {
                    slidesPerView: 3,
                  },
                  565: {
                    slidesPerView: 2,
                  },
                }}
                spaceBetween={20}
                loop={true}
                pagination={{
                  clickable: true,
                  el: ".custom_bullet",
                }}
                modules={[Pagination]}
                className="mySwiper"
              >
                {relatedProducts.map((p) => (
                  <SwiperSlide key={p.id || p.slug}>
                    <div className="w-full flex flex-col justify-center items-center">
                      <Link
                        href={`/products/${p.slug}`}
                        className="flex lg:flex-row justify-center flex-col min-w-[230px] max-w-[350px] bg-slate-100 rounded-md shadow-md"
                      >
                        <div className="relative h-[200px] w-[200px]">
                          <Image
                            width={200}
                            height={200}
                            src={p.images?.[0] || "/default-image.jpg"}
                            alt={p.name}
                            className="rounded object-cover"
                          />
                          <div className="absolute rounded-md h-[200px] w-[200px] top-0 left-0 opacity-25 hover:opacity-50 transition-all duration-500"></div>
                          {p.discount !== 0 && (
                            <div className="flex justify-center items-center absolute text-white w-[38px] h-[38px] rounded-full bg-red-500 font-semibold text-xs left-2 top-2">
                              {p.discount}%
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex flex-col gap-1">
                          <h2 className="text-slate-600 text-base md:text-lg font-semibold truncate max-w-[200px]">
                            {p.name}
                          </h2>
                          <div className="flex flex-col justify-start items-start gap-3">
                            <h2 className="text-[#6699ff]  text-lg font-bold">
                              ₹ {formatPrice(p.price)}
                            </h2>
                            <div className="flex">
                              <Rating
                                size="large"
                                type="precise"
                                rating={p.rating}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>
          <div className="w-full flex justify-center items-center py-10">
            <div className="custom_bullet justify-center gap-3 !w-auto"></div>
          </div>
        </>
      )}
    </div>
  );
};

export default RelatedProduct;
