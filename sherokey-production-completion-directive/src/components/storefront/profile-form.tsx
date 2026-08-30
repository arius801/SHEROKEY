"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, KeyRound } from "lucide-react";

export function ProfileForm({
  user,
  labels,
}: {
  locale: string;
  user: { firstName: string; lastName: string; email: string };
  labels: {
    accountInfo: string;
    firstName: string;
    lastName: string;
    email: string;
    saveChanges: string;
    updated: string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    genericError: string;
  };
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [pendingProfile, startProfile] = useTransition();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pendingPassword, startPassword] = useTransition();
  const router = useRouter();

  function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");
    startProfile(async () => {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      if (res.ok) {
        setProfileMsg(labels.updated);
        router.refresh();
      } else {
        setProfileError(labels.genericError);
      }
    });
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError(labels.genericError);
      return;
    }
    startPassword(async () => {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPasswordMsg(labels.updated);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(labels.genericError);
      }
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submitProfile} className="rounded-2xl border border-[--color-border] bg-[--color-card] p-6">
        <h2 className="mb-4 text-sm font-bold text-[--color-fg]">{labels.accountInfo}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.firstName}</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.lastName}</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.email}</label>
            <input disabled value={user.email} className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-muted]" />
          </div>
        </div>
        {profileMsg && <p className="mt-3 text-sm text-emerald-400">{profileMsg}</p>}
        {profileError && <p className="mt-3 text-sm text-rose-400">{profileError}</p>}
        <button
          type="submit"
          disabled={pendingProfile}
          className="mt-4 flex items-center gap-2 rounded-xl bg-[--color-primary] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {pendingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {labels.saveChanges}
        </button>
      </form>

      <form onSubmit={submitPassword} className="rounded-2xl border border-[--color-border] bg-[--color-card] p-6">
        <h2 className="mb-4 text-sm font-bold text-[--color-fg]">{labels.changePassword}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.currentPassword}</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.newPassword}</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[--color-muted]">{labels.confirmPassword}</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-[--color-border] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] outline-none focus:border-[--color-primary]"
            />
          </div>
        </div>
        {passwordMsg && <p className="mt-3 text-sm text-emerald-400">{passwordMsg}</p>}
        {passwordError && <p className="mt-3 text-sm text-rose-400">{passwordError}</p>}
        <button
          type="submit"
          disabled={pendingPassword}
          className="mt-4 flex items-center gap-2 rounded-xl border border-[--color-border] px-5 py-2.5 text-sm font-bold text-[--color-fg] hover:border-[--color-primary] disabled:opacity-60"
        >
          {pendingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {labels.changePassword}
        </button>
      </form>
    </div>
  );
}
