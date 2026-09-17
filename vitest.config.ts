import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Use an empty PostCSS pipeline for tests so vite ignores the app's
  // postcss.config.mjs (Tailwind v4). CSS imports (e.g. katex.min.css) become
  // harmless no-ops in the node test env; the production build is unaffected.
  css: { postcss: { plugins: [] } },
  test: {
    include: ["src/simulator/**/*.test.ts", "src/lib/ternary/**/*.test.ts"],
    environment: "node",
  },
});
