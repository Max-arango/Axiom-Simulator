import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  // Use an empty PostCSS pipeline for tests so vite ignores the app's
  // postcss.config.mjs (Tailwind v4). CSS imports (e.g. katex.min.css) become
  // harmless no-ops in the node test env; the production build is unaffected.
  css: { postcss: { plugins: [] } },
  // Resolve the "@/*" -> "src/*" path alias (tsconfig paths) so component tests
  // can import the same way the app does. Engine tests use relative imports and
  // are unaffected.
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: [
      "src/simulator/**/*.test.ts",
      "src/lib/ternary/**/*.test.ts",
      "src/lib/admin/**/*.test.ts",
      "src/components/ternary/**/*.test.tsx",
      "src/components/admin/**/*.test.tsx",
    ],
    environment: "node",
  },
});
