"use client";

import { useState } from "react";

export function NewsletterForm({ placeholder, cta, success }: { placeholder: string; cta: string; success: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setDone(true);
  }

  if (done) {
    return <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium">{success}</p>;
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        required
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/60 outline-none focus:border-white"
      />
      <button type="submit" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-white/90">
        {cta}
      </button>
    </form>
  );
}
