/**
 * Trilink DS — Stylelint config.
 * Bloqueia hex novos e font-family arbitrario; forca uso dos tokens.
 *
 * Instalar: npm install -D stylelint stylelint-config-standard
 * Rodar:   npm run lint:ds
 */

export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    // tokens.css e o UNICO arquivo onde hex podem viver
    "packages/ui/src/tokens.css",
  ],
  rules: {
    /* Cor: nao aceite hex em arquivos comuns. Use var(--*) ou tailwind semantico. */
    "color-no-hex": [
      true,
      {
        message:
          "Cores hex sao proibidas. Use var(--primary), var(--accent-blue) etc.",
      },
    ],

    /* Bloqueia 'color: red' / 'color: white' literal. */
    "declaration-property-value-disallowed-list": {
      "/^color$/": [
        "/^(red|blue|green|yellow|orange|pink|purple|gray|grey|black|white)$/i",
      ],
      "/^background(-color)?$/": [
        "/^(red|blue|green|yellow|orange|pink|purple|gray|grey|black|white)$/i",
      ],
      "/^border(-color)?$/": [
        "/^(red|blue|green|yellow|orange|pink|purple|gray|grey|black|white)$/i",
      ],
    },

    /* font-family literal e proibido — sempre via var(--font-sans|--font-mono) */
    "declaration-property-value-allowed-list": {
      "font-family": ["/^var\\(--font-/", "inherit", "initial", "unset"],
    },

    /* Permite at-rules do Tailwind/Fumadocs */
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "layer",
          "config",
          "theme",
          "variants",
          "screen",
          "responsive",
          "import",
          "custom-variant",
          "plugin",
        ],
      },
    ],

    /* Relaxar regras de specificity para shadcn / Tailwind */
    "selector-class-pattern": null,
    "no-descending-specificity": null,
  },
};
