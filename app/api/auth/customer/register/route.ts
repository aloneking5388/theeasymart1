import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { v4 as uuidv4 } from "uuid";
import { connectDB } from "@/utils/ConnectDB";
import jwt from "jsonwebtoken";
import { assignUplines  } from "@/utils/mlmUtils";
import { sendRegisterSuccessEmail } from "@/lib/registerHelper";

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const { name, email, password, referredBy } = await req.json();

    if (!name || !email || !password || !referredBy) {
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
    const referralCode = uuidv4().slice(0, 8);

    let referrer;
    if (referredBy) {
      referrer = await User.findOne({ referralCode: referredBy });

      if (!referrer) {
        return NextResponse.json(
          { success: false, message: "Invalid referral code" },
          { status: 400 }
        );
      }

      if (referrer.referralCount >= 3) {
        return NextResponse.json(
          {
            success: false,
            message: "Referral limit reached. Cannot refer more than 3 users.",
          },
          { status: 400 }
        );
      }
    }

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      referralCode,
      referredBy: referrer ? referrer._id : null,
      invested: 1500,
      status: "pending",
    });

    await newUser.save();

    if (referrer) {
      referrer.downline.push(newUser._id);
      referrer.referralCount += 1;
      await referrer.save();

      // Assign uplines to the new user
      await assignUplines(newUser._id, referrer._id);
    }

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
          status: newUser.status,
          referredBy: newUser.referredBy,
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
