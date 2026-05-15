import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  // Bridge next/core-web-vitals (legacy) to flat config
  ...compat.extends("next/core-web-vitals"),

  // Load trilink-tokens plugin via compat (resolves from root node_modules)
  ...compat.plugins("trilink-tokens"),

  // Base trilink rules — disabled for the remote feature
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "trilink-tokens/no-hex-colors": "warn",
      "trilink-tokens/no-raw-tailwind-palette": "warn",
    },
  },
  {
    files: ["src/features/remote/**/*.{ts,tsx}"],
    rules: {
      "trilink-tokens/no-hex-colors": "off",
      "trilink-tokens/no-raw-tailwind-palette": "off",
    },
  },

  // Interface layer: no direct Prisma or infrastructure imports
  {
    files: ["src/features/*/interface/**/*.{ts,tsx}", "src/components/platform/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message:
                "Interface/componente nao deve acessar Prisma diretamente. Use application/queries ou application/actions da feature — essa camada e a borda de dados correta para o server-side.",
            },
          ],
          patterns: [
            {
              group: ["@/core/infrastructure/**"],
              message:
                "Interface/componente nao deve importar infraestrutura tecnica diretamente. Use a feature ou application correspondente.",
            },
          ],
        },
      ],
    },
  },

  // Application layer: must not import from interface
  {
    files: ["src/features/*/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/features/*/interface/**"],
              message:
                "application/ nao deve importar da camada interface/. O fluxo de dependencia e: interface -> application -> infrastructure -> domain.",
            },
          ],
        },
      ],
    },
  },
];
