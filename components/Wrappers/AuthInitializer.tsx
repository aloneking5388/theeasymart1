'use client';
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { returnUserInfo } from "@/utils/authUtils";
import { setCredentials } from "@/store/Auth/authSlice";

const AuthInitializer = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    if (token) {
      const userInfo = returnUserInfo(token);
      if (userInfo && userInfo.id) {
        dispatch(setCredentials({ token }));
      }
    }
  }, []);

  return null;
};

export default AuthInitializer;