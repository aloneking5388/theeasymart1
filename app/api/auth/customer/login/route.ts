import User from "@/models/User";
import { connectDB } from "@/utils/ConnectDB";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    const customer = await User.findOne({ email }).select("+password");

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const isPasswordCorrect = await bcrypt.compare(password, customer.password);

    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: customer._id,
        role: customer.role,
        name: customer.name,
        email: customer.email,
        status: customer.status,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const data = NextResponse.json(
      {
        success: true,
        message: "Customer Login successfully",
        userInfo: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          role: customer.role,
          status: customer.status,
          
        },
        token,
      },
      { status: 201 }
    );

    data.cookies.set("token", token, {
      httpOnly: true, // Secure against XSS attacks
      secure: process.env.NODE_ENV === "production", // Only true in production
      sameSite: "strict", // Prevent CSRF attacks
      maxAge: 7 * 24 * 60 * 60, // Token expiry (7 days)
      path: "/",
    });

    return data;
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
