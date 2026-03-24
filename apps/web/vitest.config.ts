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
      "@dosc-syspro/contracts": path.resolve(__dirname, "../../packages/contracts/src/index.ts"),
      "@dosc-syspro/contracts/settings": path.resolve(__dirname, "../../packages/contracts/src/settings.ts"),
      "@dosc-syspro/contracts/sefaz-routes": path.resolve(__dirname, "../../packages/contracts/src/sefaz-routes.ts"),
      "@dosc-syspro/contracts/sefaz-endpoints": path.resolve(__dirname, "../../packages/contracts/src/sefaz-endpoints.ts"),
      "@dosc-syspro/contracts/ticket-form": path.resolve(__dirname, "../../packages/contracts/src/ticket-form.ts"),
      "@dosc-syspro/contracts/address": path.resolve(__dirname, "../../packages/contracts/src/address.ts"),
      "@dosc-syspro/contracts/documento": path.resolve(__dirname, "../../packages/contracts/src/documento.ts"),
      "@dosc-syspro/contracts/documento-config": path.resolve(__dirname, "../../packages/contracts/src/documento-config.ts"),
      "@dosc-syspro/contracts/user": path.resolve(__dirname, "../../packages/contracts/src/user.ts"),
      "@dosc-syspro/contracts/zammad-api": path.resolve(__dirname, "../../packages/contracts/src/zammad-api.ts"),
    },
  },
});