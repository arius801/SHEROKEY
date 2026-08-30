"use client";

import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";

export function ThemeToggle({ theme }: { theme: "light" | "dark" }) {
  const router = useRouter();
  const [current, setCurrent] = useState(theme);

  function toggle() {
    const next = current === "dark" ? "light" : "dark";
    document.cookie = `shk_theme=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    setCurrent(next);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[--color-border] text-[--color-fg] transition hover:border-[--color-primary] hover:text-[--color-primary]"
    >
      {current === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
