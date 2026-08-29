"use client";

import { useState } from "react";
import { Eye, Copy, Check } from "lucide-react";

export function RevealKey({ value, revealLabel, copyLabel, copiedLabel }: { value: string; revealLabel: string; copyLabel: string; copiedLabel: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[--color-border] bg-[--color-bg] px-3 py-2">
      <code className="flex-1 select-all font-mono text-sm text-[--color-fg]">{revealed ? value : "•".repeat(Math.min(value.length, 24))}</code>
      {!revealed ? (
        <button onClick={() => setRevealed(true)} className="flex items-center gap-1 rounded-lg border border-[--color-border] px-2.5 py-1.5 text-xs font-semibold text-[--color-fg] hover:border-[--color-primary]">
          <Eye className="h-3.5 w-3.5" /> {revealLabel}
        </button>
      ) : (
        <button onClick={copy} className="flex items-center gap-1 rounded-lg border border-[--color-border] px-2.5 py-1.5 text-xs font-semibold text-[--color-fg] hover:border-[--color-primary]">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} {copied ? copiedLabel : copyLabel}
        </button>
      )}
    </div>
  );
}
