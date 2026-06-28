import { verifyToken } from "@/lib/auth";
import CustomerWallet from "@/models/CustomerWallet";
import WalletTransaction from "@/models/WalletTransaction";
import { connectDB } from "@/utils/ConnectDB";
import { getTokenFromHeaders } from "@/utils/getToken";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { CustomerOrder } from "@/models/CustomerOrder";
import AuthorOrder from "@/models/AuthOrder";
import MyShopWallet from "@/models/MyShopWallet";
import SellerWallet from "@/models/SellerWallet";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromHeaders(req.headers);
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded: any = await verifyToken(token);
    const customerId = decoded.id;
    const { payAmount, orderId } = await req.json();

    if (!payAmount || !orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ message: "Invalid data" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json(
        { message: "Invalid customer ID" },
        { status: 400 }
      );
    }

    const customerObjectId = new mongoose.Types.ObjectId(customerId);
    const orderObjectId = new mongoose.Types.ObjectId(orderId);

    // ✅ Check: Order exists
    const customerOrder = await CustomerOrder.findById(orderObjectId);
    if (!customerOrder) {
      return NextResponse.json(
        { message: "Customer order not found" },
        { status: 404 }
      );
    }

    // ✅ Check: AuthorOrders exist
    const authorOrders = await AuthorOrder.find({
      $or: [
        { orderId: orderObjectId },
        { orderId: orderObjectId.toString() },
      ],
    });

    if (!authorOrders || authorOrders.length === 0) {
      return NextResponse.json(
        { message: "Author orders not found" },
        { status: 404 }
      );
    }

    // ✅ Check: Wallet exists and has enough balance
    const wallet = await CustomerWallet.findOne({ customerId: customerObjectId });
    if (!wallet || wallet.amount < payAmount) {
      return NextResponse.json(
        { message: "Insufficient wallet balance" },
        { status: 400 }
      );
    }

    // ✅ Now everything is verified — proceed with payment

    // 1. Deduct wallet amount
    wallet.amount -= payAmount;
    await wallet.save();

    // 2. Log transaction
    await WalletTransaction.create({
      customerId: customerObjectId,
      type: "debit",
      amount: payAmount,
      purpose: "Product purchase",
      orderId: orderObjectId,
      source: "purchase",
      status: "success",
    });

    // 3. Update main order
    await CustomerOrder.findByIdAndUpdate(orderObjectId, {
      payment_status: "paid",
      delivery_status: "pending",
    });

    // 4. Add to platform wallet
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    await MyShopWallet.create({ amount: payAmount, month, year });

    // 5. Update authorOrders and distribute to sellers
    for (const authorOrder of authorOrders) {
      if (!authorOrder.sellerId || !authorOrder.price) continue;

      // Update payment status of each authorOrder
      await AuthorOrder.findByIdAndUpdate(authorOrder._id, {
        payment_status: "paid",
        delivery_status: "pending",
      });

      // Credit seller's wallet
      await SellerWallet.findOneAndUpdate(
        { sellerId: authorOrder.sellerId.toString(), month, year },
        { $inc: { amount: authorOrder.price } },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json(
      { success: true, message: "Order paid successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
