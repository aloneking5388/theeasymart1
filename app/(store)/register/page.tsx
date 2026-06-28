"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import FadeLoader from "react-spinners/FadeLoader";
import { useEffect, useState } from "react";
import { FaFacebookF } from "react-icons/fa";
import {
  AiOutlineEye,
  AiOutlineEyeInvisible,
  AiOutlineGoogle,
} from "react-icons/ai";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import toast from "react-hot-toast";
import { returnRole } from "@/utils/authUtils";
import { authMessageClear, customer_register, setCredentials } from "@/store/Auth/authSlice";

const RegisterPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loader, successMessage, errorMessage, token } =
    useAppSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState({
    name: "",
    email: "",
    referralCode: "",
    password: "",
  });

  const inputHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      [e.target.name]: e.target.value,
    });
  };

  const register = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(customer_register(state));
  };

  useEffect(() => {
    if (successMessage && token) {
      localStorage.setItem("accessToken", token);
      const role = returnRole(token);
      dispatch(setCredentials({ token, role }));
      toast.success(successMessage);
      dispatch(authMessageClear());
      setState({
        name: "",
        email: "",
        referralCode: "",
        password: "",
      });
      router.push("/dashboard");
    } else if (errorMessage) {
      toast.error(errorMessage);
      dispatch(authMessageClear());
      setState({
        name: "",
        email: "",
        referralCode: "",
        password: "",
      });
    }
  }, [successMessage, errorMessage, dispatch, router, token]);

  return (
    <div>
      {loader && (
        <div className="w-screen h-screen flex justify-center items-center fixed left-0 top-0 bg-[#38303033] z-[999]">
          <FadeLoader />
        </div>
      )}
      <div className="bg-slate-200 mt-4">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-16 md:px-12 justify-center items-center md:p-10 p-5">
          <div className="grid lg:grid-cols-2 grid-cols-1 md:grid-cols-1  w-full md:w-full sm:w-full mx-auto bg-white rounded-md">
            <div className="px-8 py-8 md-lg:w-full md:w-full sm:w-full">
              <h2 className="text-center w-full text-xl text-slate-600 font-bold">
                Register
              </h2>
              <div>
                <form onSubmit={register} className="text-slate-600">
                  <div className="flex flex-col gap-1 mb-2">
                    <Label htmlFor="email">Name</Label>
                    <Input
                      onChange={inputHandle}
                      value={state.name}
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 outline-none focus:border-indigo-500 rounded-md"
                      id="name"
                      name="name"
                      placeholder="name"
                    />
                  </div>
                  <div className="flex flex-col gap-1 mb-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      onChange={inputHandle}
                      value={state.email}
                      type="email"
                      className="w-full px-3 py-2 border border-slate-200 outline-none focus:border-indigo-500 rounded-md"
                      id="email"
                      name="email"
                      placeholder="email"
                    />
                  </div>
                  <div className="flex flex-col gap-1 mb-2">
                    <Label htmlFor="email">ReferralCode</Label>
                    <Input
                      onChange={inputHandle}
                      value={state.referralCode}
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 outline-none focus:border-indigo-500 rounded-md"
                      id="referralCode"
                      name="referralCode"
                      placeholder="referralCode"
                    />
                  </div>
                  <div className="flex flex-col gap-1 mb-4 relative">
                    <Label htmlFor="password">Passoword</Label>
                    <Input
                      onChange={inputHandle}
                      value={state.password}
                      type={showPassword ? "text" : "password"}
                      className="w-full px-3 py-2 border border-slate-200 outline-none focus:border-indigo-500 rounded-md"
                      id="password"
                      name="password"
                      placeholder="password"
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-7 cursor-pointer text-xl text-slate-600"
                    >
                      {showPassword ? (
                        <AiOutlineEyeInvisible />
                      ) : (
                        <AiOutlineEye />
                      )}
                    </span>
                  </div>
                  <Button className="px-8 w-full py-2 bg-purple-500 shadow-lg hover:shadow-indigo-500/30 text-white rounded-md">
                    Register
                  </Button>
                </form>
                <div className="flex justify-center items-center py-2">
                  <div className="h-[1px] bg-slate-300 w-[95%]"></div>
                  <span className="px-3 text-slate-600">or</span>
                  <div className="h-[1px] bg-slate-300 w-[95%]"></div>
                </div>
                <Button className="px-8 w-full py-2 bg-indigo-500 shadow hover:shadow-indigo-500/30 text-white rounded-md flex justify-center items-center gap-2 mb-3">
                  <span>
                    <FaFacebookF />
                  </span>
                  <span>Register with Facebook</span>
                </Button>
                <Button className="px-8 w-full py-2 bg-orange-500 shadow hover:shadow-orange-500/30 text-white rounded-md flex justify-center items-center gap-2 mb-3">
                  <span>
                    <AiOutlineGoogle />
                  </span>
                  <span>Register with Google</span>
                </Button>
              </div>
              <div className="text-center text-slate-600 pt-1">
                <p>
                  You have a account?{" "}
                  <Link className="text-blue-500" href="/login">
                    {" "}
                    Login
                  </Link>{" "}
                </p>
              </div>
            </div>
            <div className="md:w-full md:h-full py-4 pr-4 md:block hidden">
              <Image
                className="flex justify-center items-center w-[600px] h-[380px]"
                src="/images/login.jpg"
                alt="login"
                width={600}
                height={380}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
