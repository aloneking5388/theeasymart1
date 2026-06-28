"use client";

import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import { formatPrice } from "@/utils/formatPrice";
import SkeletonProductCarouselItem from "../Skeletons/SkeletonProductCarouselItem";

interface ProductsProps {
  title: string;
  products: { slug: string; images: string[]; name: string; price: number }[][];
  loader?: boolean; // to show skeletons
}

const Products = ({ title, products, loader }: ProductsProps) => {
  const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: false }));

  const carouselRef = useRef<any>(null);

  return (
    <div className="flex gap-8 flex-col">
      <div className="text-center text-lg lg:text-2xl text-slate-600 font-bold max-sm:pb-3 lg:pb-12">
          <h2>{title}</h2>
          <div className="w-24 h-1 bg-[#7fad39] mx-auto max-sm:mt-2 mt-4" />
        </div>

      <Carousel
        plugins={[plugin.current]}
        opts={{ loop: true }}
        ref={carouselRef}
      >
        <CarouselContent>
          {loader ? Array.from({ length: 3 }).map((_, index) => (
            <CarouselItem key={index} className="basis-full">
                  <SkeletonProductCarouselItem />
                </CarouselItem>
          )) : products.flat().map((pl, index) => (
            <CarouselItem
              key={index}
              className="basis-full"
            >
              <Link
                href={`/products/${pl.slug}`}
                className="flex flex-row lg:h-[180px] bg-slate-200 rounded-md overflow-hidden items-center p-4"
              >
                <Image
                  src={pl.images[0]}
                  alt={pl.name}
                  width={150}
                  height={150}
                  className="max-md:w-[100px] max-md:h-[100px] mr-4"
                />
                <div className="flex flex-col justify-between items-start mr-2 text-slate-700">
                  <h2 className="text-[14px] font-semibold text-start">
                    {pl.name.slice(0, 40)}...
                  </h2>
                  <span className="text-xl font-bold">₹ {formatPrice(pl.price)}</span>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
};

export default Products;
