import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: [
      {
        find: /^@dosc-syspro\/remote-domain\/contracts$/,
        replacement: path.resolve(__dirname, "../remote-domain/src/contracts.ts"),
      },
      {
        find: /^@dosc-syspro\/remote-domain\/errors$/,
        replacement: path.resolve(__dirname, "../remote-domain/src/errors.ts"),
      },
      {
        find: /^@dosc-syspro\/remote-domain\/ports$/,
        replacement: path.resolve(__dirname, "../remote-domain/src/ports.ts"),
      },
      {
        find: /^@dosc-syspro\/remote-domain$/,
        replacement: path.resolve(__dirname, "../remote-domain/src/index.ts"),
      },
    ],
  },
});
