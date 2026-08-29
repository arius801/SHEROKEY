"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]";

export function LoginForm({ locale, labels }: { locale: string; labels: Record<string, string> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const redirectTo = searchParams.get("redirect") || `/${locale}/account`;
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(labels[data?.error] || data?.error || labels.invalidCredentials);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.email}</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.password}</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</p>}
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[--color-primary] px-6 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {labels.signInCta}
      </button>
    </form>
  );
}

export function RegisterForm({ locale, labels }: { locale: string; labels: Record<string, string> }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(labels.weakPassword);
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(`/${locale}/account`);
        router.refresh();
      } else {
        setError(labels[data?.error] || data?.error || labels.emailInUse);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.firstName}</label>
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.lastName}</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.email}</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.password}</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.confirmPassword}</label>
          <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        </div>
      </div>
      {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</p>}
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[--color-primary] px-6 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {labels.registerCta}
      </button>
    </form>
  );
}

export function ForgotPasswordForm({ locale, labels }: { locale: string; labels: Record<string, string> }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      setDone(true);
    });
  }

  if (done) return <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{labels.resetLinkSent}</p>;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.email}</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[--color-primary] px-6 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {labels.sendResetLink}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ locale, token, labels }: { locale: string; token: string; labels: Record<string, string> }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm || password.length < 8) {
      setError(labels.weakPassword);
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push(`/${locale}/login`), 2000);
      } else {
        setError(labels.invalidCredentials);
      }
    });
  }

  if (done) return <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{labels.passwordResetSuccess}</p>;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.password}</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.confirmPassword}</label>
        <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</p>}
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[--color-primary] px-6 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {labels.resetPassword}
      </button>
    </form>
  );
}
