import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectDB } from "@/utils/ConnectDB";
import jwt from "jsonwebtoken";
import { sendRegisterSuccessEmail } from "@/lib/registerHelper";

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password ) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "user",
        });

    await newUser.save();


    await sendRegisterSuccessEmail(email, name);

    const token = jwt.sign(
      {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const data = NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        userInfo: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
        token,
      },
      { status: 201 }
    );

    data.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return data;
  } catch (error: any) {
    console.error("Registration error:", error.message);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
