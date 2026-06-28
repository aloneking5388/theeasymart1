"use client";
import { useAppSelector } from "@/store/hooks";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { AiFillGithub, AiOutlineTwitter } from "react-icons/ai";
import { FaFacebookF, FaLinkedinIn, FaLock, FaUser } from "react-icons/fa";
import { GrMail } from "react-icons/gr";
import { MdOutlineKeyboardArrowDown } from "react-icons/md";
import OfferSlider from "./OfferSlider";

const TopHeader = () => {
  const { userInfo } = useAppSelector((state) => state.auth);

  const link = useMemo(() => {
    if (!userInfo) return "/login";
    if (userInfo.role === "admin") return "/dashboard/admin";
    if (userInfo.role === "seller") return "/dashboard/seller";
    return "/dashboard";
  }, [userInfo]);

  return (
    <div className="bg-purple-100 h-[40px] max-md:hidden">
      <div className="max-w-[1440px] mx-auto px-16 sm:px-5 max-md:px-12 md:px-10">
        <div className="flex w-full justify-between items-center h-[40px] text-slate-600">
          <ul className="flex justify-start items-center gap-8">
            <li className="flex relative justify-center items-center gap-2 text-sm after:absolute after:h-[18px] after:w-[1px] after:bg-[#afafaf] after:-right-[16px]">
              <span>
                <GrMail />
              </span>
              <span>support@theeasymart.com</span>
            </li>
            <li className="w-full">
              <OfferSlider />
            </li>
          </ul>
          <div>
            <div className="flex justify-center items-center gap-10">
              <div className="flex justify-center items-center gap-4">
                <a href="#" className="text-blue-700">
                  <FaFacebookF />
                </a>
                <a href="#" className="text-blue-400">
                  <AiOutlineTwitter />
                </a>
                <a href="#" className="text-blue-900">
                  <FaLinkedinIn />
                </a>
                <a href="#" className="text-black">
                  <AiFillGithub />
                </a>
              </div>
              <div className="flex group cursor-pointer text-slate-800 text-sm justify-center items-center gap-1 relative after:h-[18px] after:w-[1px] after:bg-[#afafaf] after:-right-[16px] after:absolute before:absolute before:h-[18px] before:bg-[#afafaf] before:w-[1px] before:-left-[20px]">
                <Image
                  src="/images/language.png"
                  alt="language"
                  width={24}
                  height={16}
                />
                <span>
                  <MdOutlineKeyboardArrowDown />
                </span>
                <ul className="absolute invisible transition-all to-12 rounded-sm duration-200 text-slate-500 p-2 w-[100px] flex flex-col gap-3 group-hover:visible group-hover:top-6 group-hover:bg-purple-200 z-10">
                  <li>Hindi</li>
                  <li>English</li>
                </ul>
              </div>
              <Link
                className="flex cursor-pointer justify-center items-center gap-2 text-sm"
                href={link}
              >
                {userInfo ? (
                  <div className="flex justify-center items-center gap-2">
                    <span>
                      {userInfo.profileImage ? (
                        <Image
                          src={userInfo.profileImage}
                          alt={userInfo.name}
                          width={30}
                          height={30}
                        />
                      ) : (
                        <FaUser />
                      )}
                    </span>
                    <span>{userInfo.name}</span>
                  </div>
                ) : (
                  <div className="flex justify-center items-center gap-2">
                    <span>
                      <FaLock />
                    </span>
                    <span>Login</span>
                  </div>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopHeader;
