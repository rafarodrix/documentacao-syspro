import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load CJS plugin via createRequire (not in node_modules of web, but in root)
const require = createRequire(import.meta.url);
const trilink = require("eslint-plugin-trilink-tokens");

// FlatCompat used only for the trilink-tokens plugin (CJS, legacy format)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: path.resolve(__dirname, "../../"),
});

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  // TypeScript parser for all .ts/.tsx files
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
  },

  // React flat config (recommended)
  {
    ...reactPlugin.configs.flat.recommended,
    files: ["src/**/*.{ts,tsx}"],
    settings: { react: { version: "detect" } },
  },

  // React 17+ new JSX transform: disables react-in-jsx-scope
  {
    ...reactPlugin.configs.flat["jsx-runtime"],
    files: ["src/**/*.{ts,tsx}"],
  },

  // React Hooks (recommended-latest uses flat config plugin object format)
  {
    ...hooksPlugin.configs["recommended-latest"],
    files: ["src/**/*.{ts,tsx}"],
  },

  // Next.js core-web-vitals (native flat config export)
  {
    ...nextPlugin.flatConfig.coreWebVitals,
    files: ["src/**/*.{ts,tsx}"],
  },

  // trilink-tokens plugin — disabled for the remote feature
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "trilink-tokens": trilink },
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
