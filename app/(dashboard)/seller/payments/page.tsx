"use client";

import { useAppSelector } from "@/store/hooks";
import axios from "@/utils/axiosInstance";
import { useEffect, useState } from "react";

type SellerPaymentRow = {
  _id: string;
  orderId: string;
  price: number;
  payment_status: string;
  payment_method?: string | null;
  payment_reference?: string | null;
  createdAt?: string;
};

const SellerPaymentsPage = () => {
  const { token } = useAppSelector((state) => state.auth);
  const [payments, setPayments] = useState<SellerPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPayments = async () => {
      if (!token) {
        setError("Please login to view seller payments.");
        setLoading(false);
        return;
      }

      try {
        const { data } = await axios.get("/order?page=1&parPage=50", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setPayments(data.orders || []);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load payments.");
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [token]);

  const paidOrders = payments.filter((item) => item.payment_status === "paid");
  const totalPaid = paidOrders.reduce((sum, item) => sum + Number(item.price || 0), 0);

  return (
    <div className="bg-white rounded-md p-5 text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Seller Payments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track paid orders, gateway names, and transaction references.
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 border border-emerald-100">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold">
            Total received
          </p>
          <p className="text-2xl font-semibold text-emerald-700">₹ {totalPaid}</p>
        </div>
      </div>

      {loading ? <p className="mt-6">Loading payments...</p> : null}
      {error ? <p className="mt-6 text-red-500">{error}</p> : null}

      {!loading && !error ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center" colSpan={6}>
                    No payment records yet.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} className="border-b">
                    <td className="px-4 py-3">{payment.orderId}</td>
                    <td className="px-4 py-3">₹ {payment.price}</td>
                    <td className="px-4 py-3">{payment.payment_status}</td>
                    <td className="px-4 py-3">{payment.payment_method || "pending"}</td>
                    <td className="px-4 py-3 break-all text-xs">
                      {payment.payment_reference || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {payment.createdAt
                        ? new Date(payment.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default SellerPaymentsPage;