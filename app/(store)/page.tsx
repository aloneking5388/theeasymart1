import Categorys from "@/components/StoreComponents/Categorys";
import Banner from "@/components/StoreComponents/Banner";
import FeatureProducts from "@/components/StoreComponents/FeatureProducts";
import Product from "@/components/StoreComponents/Product";

export default function Home() {
  return (
    <main className="w-full">
      <Banner />
      <div className="lg:my-4 my-1 max-w-[1440px] mx-auto px-5 md:px-10 lg:px-16">
        <Categorys />
      </div>
      <div className="lg:py-[45px] py-2 max-w-[1440px] mx-auto px-5 md:px-10 lg:px-16">
        <FeatureProducts />
      </div>
      <div className="py-10">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10 lg:px-10 flex flex-wrap">
         <Product />
        </div>
      </div>
    </main>
  );
}
