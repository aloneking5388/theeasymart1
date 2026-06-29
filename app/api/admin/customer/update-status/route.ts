import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/utils/ConnectDB";
import { getTokenFromHeaders } from "@/utils/getToken";
import { verifyToken } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  await connectDB();

  try {
  
    const token = getTokenFromHeaders(req.headers);

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId, status } = await req.json();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        {
          status: 404,
        }
      );
    }

    await user.save();

    

    return NextResponse.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: `Error updating user status: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
