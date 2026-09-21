// Browser file-download helpers for the Quantum Lab. Both are SSR-safe: with no
// DOM they no-op / fall back, so callers never need to guard `window` themselves.

/** Trigger a client download of `text` as `filename`. No-op under SSR (no DOM). */
export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  if (typeof document === "undefined") return; // SSR / no DOM
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Filesystem-safe base name: lowercase, non-alphanumerics → "-", trimmed. */
export function slug(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "circuito";
}
