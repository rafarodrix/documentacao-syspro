import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@dosc-syspro/config": resolve(__dirname, "../../packages/config/src/index.ts"),
      "@dosc-syspro/tickets-domain": resolve(__dirname, "../../packages/features/tickets/domain/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
  },
});
