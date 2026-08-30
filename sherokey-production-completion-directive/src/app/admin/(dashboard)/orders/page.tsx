"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Order = {
  id: number;
  orderNumber: string;
  email: string;
  status: string;
  paymentStatus: string;
  deliveryStatus: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
};

function OrdersTable() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";
  const [status, setStatus] = useState(initialStatus);
  const [items, setItems] = useState<Order[] | null>(null);

  useEffect(() => {
    const qs = status ? `?status=${status}` : "";
    fetch(`/api/admin/orders${qs}`).then((r) => r.json()).then((d) => setItems(d.items ?? []));
  }, [status]);

  const statuses = ["", "pending_payment", "processing", "completed", "cancelled", "refunded", "failed"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Orders</h1>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${status === s ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}>
            {s ? s.replace("_", " ") : "All"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items === null ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No orders found.</td></tr>
            ) : (
              items.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-indigo-400 hover:underline">{o.orderNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{o.email}</td>
                  <td className="px-4 py-3 text-slate-400 capitalize">{o.status.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-slate-400 capitalize">{o.paymentStatus}</td>
                  <td className="px-4 py-3 text-slate-300">{(o.totalMinor / 100).toFixed(2)} {o.currency}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Loading…</p>}>
      <OrdersTable />
    </Suspense>
  );
}
