"use client";

import { useAppSelector } from "@/store/hooks";
import axios from "@/utils/axiosInstance";
import { useEffect, useState } from "react";

type AdminPaymentRow = {
  _id: string;
  price: number;
  payment_status: string;
  payment_method?: string | null;
  payment_reference?: string | null;
  wallet_amount?: number;
  createdAt?: string;
  shippingInfo?: {
    name?: string;
    phone?: string;
  };
};

const AdminPaymentRequestPage = () => {
  const { token } = useAppSelector((state) => state.auth);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPayments = async () => {
      if (!token) {
        setError("Please login to view payment data.");
        setLoading(false);
        return;
      }

      try {
        const { data } = await axios.get("/order?page=1&parPage=100", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setPayments(data.orders || []);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load payment report.");
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [token]);

  const paid = payments.filter((item) => item.payment_status === "paid");
  const unpaid = payments.filter((item) => item.payment_status !== "paid");
  const gross = paid.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const walletUsage = paid.reduce(
    (sum, item) => sum + Number(item.wallet_amount || 0),
    0
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 border border-slate-100">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Paid orders</p>
          <p className="mt-2 text-3xl font-semibold text-slate-800">{paid.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 border border-slate-100">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending orders</p>
          <p className="mt-2 text-3xl font-semibold text-slate-800">{unpaid.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 border border-slate-100">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gross paid</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">₹ {gross}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 border border-slate-100">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wallet used</p>
          <p className="mt-2 text-3xl font-semibold text-orange-600">₹ {walletUsage}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 text-slate-700">
        <div>
          <h1 className="text-2xl font-semibold">Payment Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            All customer payments, wallet usage, gateway names, and references.
          </p>
        </div>

        {loading ? <p className="mt-6">Loading payment report...</p> : null}
        {error ? <p className="mt-6 text-red-500">{error}</p> : null}

        {!loading && !error ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Gateway</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={8}>
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment._id} className="border-b align-top">
                      <td className="px-4 py-3">{payment._id}</td>
                      <td className="px-4 py-3">
                        <div>{payment.shippingInfo?.name || "-"}</div>
                        <div className="text-xs text-slate-500">
                          {payment.shippingInfo?.phone || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">₹ {payment.price}</td>
                      <td className="px-4 py-3">₹ {payment.wallet_amount || 0}</td>
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
    </div>
  );
};

export default AdminPaymentRequestPage;