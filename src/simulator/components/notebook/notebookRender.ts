import katex from "katex";

export function tex(src: string, display = false): string {
  return katex.renderToString(src, { displayMode: display, throwOnError: false, output: "htmlAndMathml" });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Split on `$...$` math spans: even chunks are user text (escaped), odd chunks are math (KaTeX, trusted).
function inline(t: string): string {
  return t.split(/\$([^$]+)\$/g).map((chunk, i) => (i % 2 ? tex(chunk) : escapeHtml(chunk))).join("");
}

export function renderMarkdownToHtml(source: string): string {
  return source.split("\n").map((line) => {
    if (line.startsWith("# ")) return `<h3 class="text-base font-semibold text-stone-100">${inline(line.slice(2))}</h3>`;
    if (line.startsWith("## ")) return `<h4 class="text-sm font-semibold text-vermilion-200">${inline(line.slice(3))}</h4>`;
    if (!line.trim()) return "<div class='h-2'></div>";
    return `<p class="text-sm text-stone-300">${inline(line)}</p>`;
  }).join("");
}
