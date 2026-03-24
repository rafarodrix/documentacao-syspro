import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@dosc-syspro/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@dosc-syspro/core/config/route-access": path.resolve(__dirname, "../../packages/core/src/config/route-access.ts"),
      "@dosc-syspro/core/config/role-labels": path.resolve(__dirname, "../../packages/core/src/config/role-labels.ts"),
      "@dosc-syspro/core/config/contract-blocking": path.resolve(__dirname, "../../packages/core/src/config/contract-blocking.ts"),
      "@dosc-syspro/core/config/zammad-state-matrix": path.resolve(__dirname, "../../packages/core/src/config/zammad-state-matrix.ts"),
      "@dosc-syspro/core/config/tickets-workflow": path.resolve(__dirname, "../../packages/core/src/config/tickets-workflow.ts"),
      "@dosc-syspro/core/entities/ticket": path.resolve(__dirname, "../../packages/core/src/entities/ticket.ts"),
      "@dosc-syspro/core/entities/release": path.resolve(__dirname, "../../packages/core/src/entities/release.ts"),
      "@dosc-syspro/core/services/zammad-sla": path.resolve(__dirname, "../../packages/core/src/services/zammad-sla.ts"),
    },
  },
});