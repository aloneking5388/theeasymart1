"use client";

import { get_dashboard_index_data } from "@/store/Dashboard/dashboardSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AiOutlineShoppingCart,
  AiOutlineCheckCircle,
  AiOutlineHistory,
} from "react-icons/ai";
import { setOrderDetails } from "@/store/Order/orderSlice";
import { Order } from "@/types/order";

const DashboardStats = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { userInfo } = useAppSelector((state) => state.auth);
  const { totalOrders, pendingOrders, confirmedOrders, recentOrders } =
    useAppSelector((state) => state.dashboard);
  const safeRecentOrders = Array.isArray(recentOrders) ? recentOrders : [];

  useEffect(() => {
    if (userInfo?.id) {
      dispatch(get_dashboard_index_data(userInfo.id));
    }
  }, [userInfo?.id, dispatch]);

  const redirect = (order: any) => {
    dispatch(
      setOrderDetails({
        orderId: order._id,
        totalPrice: order.price,
        items: order.products.reduce(
          (sum: number, p: any) => sum + p.quantity,
          0,
        ),
      }),
    );
    router.push("/payment");
  };

  const cellClass =
    "px-6 py-3 whitespace-nowrap text-[13px] max-md:px-2 max-md:text-[10px]";

  return (
    <>
      {/* Quick Stats */}
      <div className="grid items-start justify-start grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          icon={<AiOutlineShoppingCart />}
          color="green"
          value={pendingOrders}
          label="Pending Orders"
        />
        <StatCard
          icon={<AiOutlineCheckCircle />}
          color="blue"
          value={confirmedOrders}
          label="Confirm Orders"
        />
        <StatCard
          icon={<AiOutlineHistory />}
          color="purple"
          value={totalOrders}
          label="Order History"
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-white p-4 mt-5 rounded-md">
        <h2 className="text-lg font-semibold text-slate-600">Order History</h2>
        <div className="pt-4">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm max-md:text-[8px] text-left text-gray-500">
              <thead className="text-gray-700 my-1 uppercase bg-gray-50">
                <tr>
                  {[
                    "Order Id",
                    "Price",
                    "Payment Status",
                    "Order Status",
                    "Action",
                  ].map((h) => (
                    <th key={h} className={cellClass}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {safeRecentOrders.length === 0 ? (
                  <tr className="bg-white border-b">
                    <td colSpan={5} className={`${cellClass} text-center py-6`}>
                      No recent orders yet.
                    </td>
                  </tr>
                ) : (
                  safeRecentOrders.map((order: Order) => (
                    <tr key={order._id} className="bg-white border-b">
                      <td className={cellClass}>{order._id}</td>
                      <td className={cellClass}>₹ {order.price}</td>
                      <td className={cellClass}>{order.payment_status}</td>
                      <td className={cellClass}>{order.delivery_status}</td>
                      <td className={cellClass}>
                        <Link href={`/dashboard/orders/${order._id}`}>
                          <span className="bg-green-100 text-green-800 text-sm max-md:text-[8px] font-normal mr-2 px-2.5 max-md:px-1 py-px rounded">
                            View
                          </span>
                        </Link>
                        {order.payment_status !== "paid" && (
                          <span
                            onClick={() => redirect(order)}
                            className="bg-red-100 text-red-800 text-sm max-md:text-[8px] font-normal mr-2 px-2.5 max-md:px-1 py-px rounded cursor-pointer"
                          >
                            Pay Now
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardStats;

const StatCard = ({
  icon,
  color,
  value,
  label,
}: {
  icon: React.JSX.Element;
  color: string;
  value: any;
  label: string;
}) => {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    green: { bg: "bg-green-100", text: "text-green-800" },
    blue: { bg: "bg-blue-100", text: "text-blue-800" },
    red: { bg: "bg-red-100", text: "text-red-800" },
    purple: { bg: "bg-purple-100", text: "text-purple-800" },
  };

  const { bg, text } = colorClasses[color] || colorClasses.green;

  return (
    <div className="flex justify-center items-center p-5 bg-white rounded-md gap-5">
      <div
        className={`${bg} w-11.75 max-md:w-7.5 max-md:h-7.5 max-md:text-lg h-11.75 rounded-full flex justify-center items-center text-xl`}
      >
        <span className={text}>{icon}</span>
      </div>
      <div className="flex flex-col justify-start items-start text-slate-600">
        <h2 className="text-2xl max-md:text-xs font-semibold">{value}</h2>
        <span className="max-sm:text-[8px]">{label}</span>
      </div>
    </div>
  );
};
