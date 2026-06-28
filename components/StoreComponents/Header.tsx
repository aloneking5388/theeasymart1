"use client";
import Link from "next/link";
import { AiFillHeart, AiFillShopping } from "react-icons/ai";
import { FaList } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { MdOutlineKeyboardArrowDown } from "react-icons/md";
import { IoIosCall } from "react-icons/io";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import TopHeader from "./TopHeader";
import MobileSidebar from "./MobileSidebar";
import { getCartItems, getWishlistItems } from "@/store/cart/cartSlice";

const StoreHeader = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { categorys } = useAppSelector((state) => state.home);
  const { userInfo } = useAppSelector((state) => state.auth);
  const { cartCount, wishlistCount } = useAppSelector((state) => state.cart)
  const pathname = usePathname();
  const [showShidebar, setShowShidebar] = useState(false);
  const [categoryShow, setCategoryShow] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [category, setCategory] = useState("");

  const search = () => {
    if (searchValue) {
      router.push(`/products/search?category=${category}&searchValue=${searchValue}`);
    } else {
      router.push(`/products?category=${category}`);
    }
  };


  useEffect(() => {
    if (userInfo) {
      dispatch(getCartItems({ id: userInfo.id }));
      dispatch(getWishlistItems({ id: userInfo.id }));
    }
  }, [userInfo, dispatch]);

  return (
    <div className="w-full bg-white lg:mb-2">
      <TopHeader />
      <div className="bg-white ">
        <div className="max-w-[1440px] mx-auto px-5 md:px-8 mb-4">
          <div className="h-[60px] max-md:h-[40px] flex justify-between items-center flex-wrap">
            <div className="max-md:w-full w-3/12 max-sm:py-2 mb-2">
              <div className="flex md:ml-13 justify-between items-center">
                <Link href="/">
                  <Image
                    className="max-md:w-[180px] max-md:h-[60px]"
                    src="/images/logo.png"
                    alt="logo"
                    width={260}
                    height={100}
                  />
                </Link>
                <div
                  className="justify-center items-center w-[30px] h-[30px] bg-white text-slate-600 border border-slate-600 rounded-sm cursor-pointer lg:hidden max-md:flex xl:hidden hidden"
                  onClick={() => setShowShidebar(!showShidebar)}
                >
                  <span>
                    <FaList />
                  </span>
                </div>
              </div>
            </div>
            <div className="max-md:w-full w-9/12">
              <div className="flex justify-between max-md:justify-center items-center flex-wrap pl-20">
                <ul className="flex justify-start items-start gap-10 text-sm font-bold uppercase max-md:hidden">
                  <li>
                    <Link
                      href="/"
                      className={`p-2 block ${
                        pathname === "/" ? "text-purple-500" : "text-slate-600"
                      }`}
                    >
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/shop"
                      className={`p-2 block ${
                        pathname === "/shop"
                          ? "text-purple-500"
                          : "text-slate-600"
                      }`}
                    >
                      Shop
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/blog"
                      className={`p-2 block ${
                        pathname === "/blog"
                          ? "text-purple-500"
                          : "text-slate-600"
                      }`}
                    >
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/about"
                      className={`p-2 block ${
                        pathname === "/about"
                          ? "text-purple-500"
                          : "text-slate-600"
                      }`}
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className={`p-2 block ${
                        pathname === "/contact"
                          ? "text-purple-500"
                          : "text-slate-600"
                      }`}
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
                <div className="flex max-md:hidden justify-center mr-15 items-center gap-4">
                  <div className="flex justify-center gap-4">
                    <div
                      onClick={() =>
                        router.push(
                          userInfo ? "/dashboard/wishlist" : "/login"
                        )
                      }
                      className="relative flex justify-center items-center cursor-pointer w-[35px] h-[35px] rounded-full bg-[#e2e2e2]"
                    >
                      <span className="text-xl text-pink-600">
                        <AiFillHeart />
                      </span>
                      {wishlistCount !== 0 &&
                        <div className="w-[18px] h-[18px] absolute bg-red-700 rounded-full text-white font-semibold flex text-xs justify-center items-center -top-[3px] -right-[5px]">
                        {wishlistCount}
                      </div>
                      }
                    </div>
                    <div 
                       onClick={() =>
                        router.push(
                          userInfo ? "/cart" : "/login"
                        )
                      }
                    className="relative flex justify-center items-center cursor-pointer w-[35px] h-[35px] rounded-full bg-[#e2e2e2]">
                      <span className="text-xl text-purple-600">
                        <AiFillShopping />
                      </span>

                     {cartCount !== 0 && 
                             <div className="w-[18px] h-[18px] absolute bg-red-700 rounded-full text-white font-semibold text-xs flex justify-center items-center -top-[3px] -right-[5px]">
                             {cartCount}
                           </div>
                     }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileSidebar showShidebar={showShidebar} setShowShidebar={setShowShidebar} />
      <div className="w-[85%] lg:w-[90%] mx-auto pt-2.5">
        <div className="flex w-full flex-wrap max-md:gap-4">
          <div className="w-3/12 max-md:w-full">
            <div className="bg-white relative">
              <div
                onClick={() => setCategoryShow(!categoryShow)}
                className="h-[40px] rounded-xl bg-purple-400 hover:bg-purple-600 text-white flex justify-center max-md:justify-between max-md:px-6 items-center gap-3 font-bold text-md cursor-pointer"
              >
                <div className="flex justify-center items-center gap-3">
                  <span>
                    <FaList />
                  </span>
                  <span>All Category</span>
                </div>
                <span className="pt-1">
                  <MdOutlineKeyboardArrowDown />
                </span>
              </div>
              <div
                className={`${
                  categoryShow ? "h-0" : "h-[400px]"
                } overflow-hidden rounded-xl transition-all max-md:relative duration-500 absolute z-[99999] bg-white w-full border-x`}
              >
                <ul className="py-2 text-slate-600 font-medium h-full overflow-auto">
                  {categorys.map((c, i) => {
                    return (
                      <li
                        key={i}
                        className="flex justify-start items-center gap-2 px-[24px] py-[6px]"
                      >
                        <Image
                          src={c.image}
                          className="rounded-full overflow-hidden"
                          alt={c.name}
                          width={30}
                          height={30}
                        />
                        <Link
                          href={`/products?category=${c.name}`}
                          className="text-sm block"
                          onClick={() => setCategoryShow(!categoryShow)}
                        >
                          {c.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
          <div className="w-9/12 pl-8 max-md:pl-0 max-md:w-full">
            <div className="flex flex-wrap w-full justify-between items-center max-md:gap-6">
              <div className="w-8/12 max-md:w-full">
                <div className="flex border h-[40px] rounded-xl items-center relative gap-5">
                  <div className="relative after:absolute after:h-[25px] after:w-[1px] after:bg-[#afafaf] after:-right-[15px] max-md:hidden">
                    <select
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-[150px] text-slate-600 font-semibold bg-transparent px-2 h-full outline-0 border-none"
                      name=""
                      id=""
                    >
                      <option value="">Select category</option>
                      {categorys.map((c, i) => (
                        <option key={i} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    className="w-full relative bg-transparent text-slate-500 outline-0 px-3 h-full"
                    onChange={(e) => setSearchValue(e.target.value)}
                    value={searchValue}
                    type="text"
                    name=""
                    id=""
                    placeholder="what do you need"
                  />
                  <Button
                    onClick={search}
                    className="bg-purple-400 rounded-r-xl hover:bg-purple-600 right-0 absolute px-8 h-full font-semibold uppercase text-white"
                  >
                    Search
                  </Button>
                </div>
              </div>
              <div className="w-4/12 block max-md:hidden pl-2 max-md:w-full max-md:pl-0">
                <div className="w-full flex justify-end max-md:justify-start gap-3 items-center">
                  <div className="w-[40px] h-[40px] rounded-full flex bg-purple-100 justify-center items-center">
                    <span>
                      <IoIosCall />
                    </span>
                  </div>
                  <div className="flex justify-end flex-col gap-1">
                    <h2 className="text-sm font-bold text-slate-700">
                      +91 (997) 9859732
                    </h2>
                    <span className="text-xs font-semibold">support 24/7 time</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreHeader;
