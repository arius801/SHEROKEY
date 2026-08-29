import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  KeyRound,
  Ticket,
  ShoppingCart,
  Users,
  Star,
  LifeBuoy,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/license-keys", label: "License Inventory", icon: KeyRound },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/users", label: "Customers", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  // Admin authentication is completely separate from customer auth: only
  // "admin"/"manager" roles may pass this guard, and every /admin page and
  // /api/admin/* route re-checks this server-side (never trusting the client).
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased" dir="ltr">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900/60 p-4 lg:block">
          <div className="mb-6 px-2 text-lg font-bold text-indigo-400">SHEROKEY Admin</div>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 border-t border-slate-800 pt-4">
            <p className="px-2 text-xs text-slate-500">Signed in as</p>
            <p className="px-2 text-sm font-medium text-white">{user.email}</p>
            <form action="/api/auth/logout" method="post">
              <button
                formAction="/api/auth/logout"
                className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </aside>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="lg:hidden mb-4 flex flex-wrap gap-2">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                {item.label}
              </Link>
            ))}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
