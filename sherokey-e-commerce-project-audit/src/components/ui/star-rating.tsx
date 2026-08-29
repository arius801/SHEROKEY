import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ rating, size = 14, showValue = false }: { rating: number; size?: number; showValue?: boolean }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= rounded;
        const half = !filled && i + 0.5 === rounded;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-[--color-border]" fill="currentColor" />
            {(filled || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: half ? "50%" : "100%" }}>
                <Star size={size} className="text-amber-400" fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
      {showValue && <span className={cn("ms-1 text-xs font-medium text-[--color-muted]")}>{rating.toFixed(1)}</span>}
    </span>
  );
}
