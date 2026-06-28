import Link from "next/link";
import SearchPro from "@/components/StoreComponents/SearchPro";
import { MdOutlineKeyboardArrowRight } from "react-icons/md";

const CategoryShops = () => {
 

  return (
    <div>
      <div className="max-w-[1440px] mx-auto lg:px-12 md:px-10">
        <section
          style={{ backgroundImage: 'url("/images/banner/shop.gif")' }}
          className="h-[200px] mt-6 bg-cover bg-no-repeat relative bg-left"
        >
          <div className="absolute left-0 top-0 w-full h-full bg-[#2422228a]">
            <div className="w-full h-full mx-auto">
              <div className="flex flex-col justify-center gap-1 items-center h-full w-full text-white">
                <h2 className="text-xl font-bold">Catogerys</h2>
                <div className="flex justify-center max-md:text-sm items-center gap-2 text-2xl w-full">
                  <Link href="/">Home</Link>
                  <span className="pt-1">
                    <MdOutlineKeyboardArrowRight />
                  </span>
                  <span>Products</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
     <SearchPro />
    </div>
  );
};

export default CategoryShops;
