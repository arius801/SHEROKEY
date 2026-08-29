import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";

// The middleware normally redirects "/" to "/{locale}" before this ever renders.
// This is a safety-net fallback for edge cases (e.g. static optimization probes).
export default function RootIndexPage() {
  redirect(`/${DEFAULT_LOCALE}`);
}
