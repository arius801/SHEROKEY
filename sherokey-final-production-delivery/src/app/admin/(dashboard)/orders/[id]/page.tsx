"use client";

import { useEffect, useState, use as usePromise } from "react";
import { Loader2, RotateCcw } from "lucide-react";

type OrderDetail = {
  order: {
    id: number;
    orderNumber: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    paymentStatus: string;
    deliveryStatus: string;
    currency: string;
    subtotalMinor: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    couponCode: string | null;
    createdAt: string;
  };
  items: {
    id: number;
    productNameSnapshot: string;
    variantNameSnapshot: string;
    quantity: number;
    unitPriceMinor: number;
    totalMinor: number;
    fulfillmentStatus: string;
    deliveries: { id: number; licenseKeyId: number | null; downloadUrl: string | null; instructions: string | null; deliveredAt: string | null }[];
  }[];
  payments: { id: number; provider: string; transactionId: string; amountMinor: number; currency: string; status: string; createdAt: string }[];
};

const STATUS_OPTIONS = ["pending_payment", "processing", "completed", "cancelled", "refunded", "failed"];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [data, setData] = useState<OrderDetail | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [message, setMessage] = useState("");

  function load() {
    fetch(`/api/admin/orders/${id}`).then((r) => r.json()).then(setData);
  }
  useEffect(load, [id]);

  async function updateStatus(status: string) {
    setStatusSaving(true);
    await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setStatusSaving(false);
    load();
  }

  async function refund() {
    if (!confirm("Refund this order via the original payment gateway? This cannot be undone.")) return;
    setRefunding(true);
    setMessage("");
    const res = await fetch(`/api/admin/orders/${id}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const d = await res.json().catch(() => ({}));
    setRefunding(false);
    if (res.ok) {
      setMessage("Refund processed.");
      load();
    } else {
      setMessage(d?.message || "Refund failed.");
    }
  }

  if (!data) return <p className="text-slate-400">Loading…</p>;
  const { order, items, payments } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Order #{order.orderNumber}</h1>
          <p className="text-sm text-slate-400">{order.email} · {order.firstName} {order.lastName}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={order.status} disabled={statusSaving} onChange={(e) => updateStatus(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          {order.paymentStatus === "paid" && (
            <button onClick={refund} disabled={refunding} className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-60">
              {refunding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Refund
            </button>
          )}
        </div>
      </div>
      {message && <p className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200">{message}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Payment status" value={order.paymentStatus} />
        <SummaryCard label="Delivery status" value={order.deliveryStatus} />
        <SummaryCard label="Total" value={`${(order.totalMinor / 100).toFixed(2)} ${order.currency}`} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm font-bold text-white">Items</h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{item.productNameSnapshot}</p>
                  <p className="text-xs text-slate-400">{item.variantNameSnapshot} × {item.quantity}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${item.fulfillmentStatus === "delivered" ? "bg-emerald-500/10 text-emerald-400" : item.fulfillmentStatus === "failed" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>
                  {item.fulfillmentStatus}
                </span>
              </div>
              {item.deliveries.map((d) => (
                <div key={d.id} className="mt-2 text-xs text-slate-400">
                  {d.licenseKeyId ? `License key #${d.licenseKeyId} assigned` : d.downloadUrl ? d.downloadUrl : d.instructions || "Manual fulfillment pending"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm font-bold text-white">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-500">No payment records yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="pb-2">Provider</th><th className="pb-2">Transaction</th><th className="pb-2">Amount</th><th className="pb-2">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 text-slate-300 capitalize">{p.provider}</td>
                  <td className="py-2 font-mono text-xs text-slate-400">{p.transactionId}</td>
                  <td className="py-2 text-slate-300">{(p.amountMinor / 100).toFixed(2)} {p.currency}</td>
                  <td className="py-2 text-slate-400 capitalize">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-lg font-bold capitalize text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
