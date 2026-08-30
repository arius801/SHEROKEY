export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Client-side helper to set a browser cookie. Kept as a standalone, top-level
 * function (rather than inline inside a component) so the mutation of the
 * global `document` object is not tied to component render/hook scope.
 */
export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value};path=/;max-age=${maxAgeSeconds}`;
}
