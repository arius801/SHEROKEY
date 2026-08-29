import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  bestseller: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  popular: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  new: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sale: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  instant: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  verified: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  limited: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  default: "bg-[--color-primary]/15 text-[--color-primary] border-[--color-primary]/30",
};

export function Badge({ tone = "default", children, className }: { tone?: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        STYLES[tone] ?? STYLES.default,
        className
      )}
    >
      {children}
    </span>
  );
}
