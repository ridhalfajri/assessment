import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
    // unit/route/integrasi API submit-survey (BETE-7) + unit engine (BETE-6)
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
  },
});
