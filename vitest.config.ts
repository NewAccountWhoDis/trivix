// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    globals: false,
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest-setup.ts"],
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
    ],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
  },
});
