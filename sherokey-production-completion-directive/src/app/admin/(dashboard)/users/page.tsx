"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserRow[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setItems(d.items ?? []));
  }
  useEffect(load, []);

  async function updateRole(id: number, role: string) {
    setBusyId(id);
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    setBusyId(null);
    load();
  }

  async function toggleStatus(id: number, status: string) {
    setBusyId(id);
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: status === "active" ? "disabled" : "active" }) });
    setBusyId(null);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Customers</h1>
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items === null ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : (
              items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-slate-300">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-slate-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                    >
                      <option value="customer">Customer</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${u.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u.emailVerified ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button disabled={busyId === u.id} onClick={() => toggleStatus(u.id, u.status)} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-rose-500 hover:text-rose-400">
                      {u.status === "active" ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
