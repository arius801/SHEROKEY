"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, DollarSign, Package, ShoppingCart, Users, KeyRound, Star, LifeBuoy } from "lucide-react";

type Stats = {
  totalOrders: number;
  paidOrders: number;
  totalRevenueMinor: number;
  last30dRevenueMinor: number;
  last30dOrders: number;
  productCount: number;
  activeProductCount: number;
  customerCount: number;
  openTickets: number;
  availableLicenseKeys: number;
  pendingReviews: number;
  fulfillmentIssues: number;
  recentOrders: { id: number; orderNumber: string; email: string; status: string; paymentStatus: string; totalMinor: number; currency: string; createdAt: string }[];
};

function money(minor: number, currency: string) {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) return <p className="text-slate-400">Loading dashboard…</p>;

  const cards = [
    { label: "Total revenue (paid)", value: money(stats.totalRevenueMinor, "USD"), icon: DollarSign, color: "text-emerald-400" },
    { label: "Revenue (30d)", value: money(stats.last30dRevenueMinor, "USD"), icon: DollarSign, color: "text-emerald-400" },
    { label: "Orders", value: `${stats.paidOrders} paid / ${stats.totalOrders} total`, icon: ShoppingCart, color: "text-indigo-400" },
    { label: "Products", value: `${stats.activeProductCount} active / ${stats.productCount} total`, icon: Package, color: "text-sky-400" },
    { label: "Customers", value: stats.customerCount, icon: Users, color: "text-purple-400" },
    { label: "Available license keys", value: stats.availableLicenseKeys, icon: KeyRound, color: "text-amber-400" },
    { label: "Pending reviews", value: stats.pendingReviews, icon: Star, color: "text-yellow-400" },
    { label: "Open tickets", value: stats.openTickets, icon: LifeBuoy, color: "text-rose-400" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {stats.fulfillmentIssues > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            {stats.fulfillmentIssues} paid order(s) need manual fulfillment attention.{" "}
            <Link href="/admin/orders?status=processing" className="underline">
              Review now
            </Link>
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <c.icon className={`mb-3 h-5 w-5 ${c.color}`} />
            <p className="text-xl font-bold text-white">{c.value}</p>
            <p className="text-xs text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm font-bold text-white">Recent orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2">Order</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Payment</th>
                <th className="pb-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stats.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2">
                    <Link href={`/admin/orders/${o.id}`} className="text-indigo-400 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-2 text-slate-300">{o.email}</td>
                  <td className="py-2 text-slate-300">{o.status}</td>
                  <td className="py-2 text-slate-300">{o.paymentStatus}</td>
                  <td className="py-2 text-slate-300">{money(o.totalMinor, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
