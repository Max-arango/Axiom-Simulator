import { describe, it, expect } from "vitest";
import { renderMarkdownToHtml } from "./notebookRender.ts";

describe("renderMarkdownToHtml — XSS escaping", () => {
  it("escapes a raw html payload with no math (no live tag)", () => {
    const html = renderMarkdownToHtml("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img ");
  });

  it("renders math as KaTeX while escaping surrounding text", () => {
    const html = renderMarkdownToHtml("hello $x^2$ world");
    expect(html).toContain("katex"); // KaTeX output present
    // plain words render as visible inert text
    expect(html).toContain("hello ");
    expect(html).toContain(" world");
  });

  it("mixes math and html: math becomes katex, script is escaped", () => {
    const html = renderMarkdownToHtml("$a$ <script>x</script>");
    expect(html).toContain("katex");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
