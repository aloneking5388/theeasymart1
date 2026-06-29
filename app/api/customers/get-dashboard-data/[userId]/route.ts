import { CustomerOrder } from "@/models/CustomerOrder";
import { connectDB } from "@/utils/ConnectDB";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import CustomerWallet from "@/models/CustomerWallet";

export async function GET(req: NextRequest) {
  await connectDB();

  const userId = req.nextUrl.pathname.split("/").pop();

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const customerId = new mongoose.Types.ObjectId(userId);

  try {
    const [
      user,
      recentOrders,
      totalOrders,
    ] = await Promise.all([
      User.findById(customerId).select("-password"),
      CustomerWallet.findOne({ customerId }).select("amount"),
      CustomerOrder.find({ customerId }).sort({ createdAt: -1 }).limit(5),
      CustomerOrder.countDocuments({ customerId }),
    ]);

    return NextResponse.json({
      user,
      recentOrders,
      totalOrders,
    }, { status: 200 });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to fetch customer data" }, { status: 500 });
  }
}
