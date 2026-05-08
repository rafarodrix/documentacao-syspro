/**
 * eslint-plugin-trilink-tokens
 * ----------------------------
 * Bloqueia hex em strings JSX/TS e classes Tailwind palette cruas
 * (text-gray-500, bg-zinc-100, etc) que deveriam ser tokens semanticos.
 *
 * Registrado em .eslintrc.json:
 *   "plugins": ["trilink-tokens"],
 *   "rules": {
 *     "trilink-tokens/no-hex-colors": "error",
 *     "trilink-tokens/no-raw-tailwind-palette": "warn"
 *   }
 */

const HEX_RE = /#([0-9a-fA-F]{3}){1,2}\b/;
const RAW_PALETTE_RE =
  /\b(text|bg|border|ring|from|to|via|fill|stroke|divide|outline|placeholder|caret|accent|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b/;

const SEMANTIC_REPLACEMENTS = {
  "text-gray-500": "text-muted-foreground",
  "text-gray-600": "text-muted-foreground",
  "text-zinc-500": "text-muted-foreground",
  "text-neutral-500": "text-muted-foreground",
  "bg-gray-50": "bg-muted",
  "bg-gray-100": "bg-muted",
  "bg-zinc-50": "bg-muted",
  "bg-white": "bg-background",
  "bg-black": "bg-foreground",
  "border-gray-200": "border-border",
  "border-zinc-200": "border-border",
  "border-neutral-200": "border-border",
};

module.exports = {
  rules: {
    "no-hex-colors": {
      meta: {
        type: "problem",
        docs: { description: "Bloqueia cores em hex; use tokens var(--*)." },
        messages: {
          hex: "Hex color '{{value}}' detectada. Use um token (var(--primary), var(--accent-blue), etc).",
        },
        schema: [],
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value !== "string") return;
            const m = node.value.match(HEX_RE);
            if (m)
              context.report({ node, messageId: "hex", data: { value: m[0] } });
          },
          TemplateElement(node) {
            const raw = node.value && node.value.raw;
            if (!raw) return;
            const m = raw.match(HEX_RE);
            if (m)
              context.report({ node, messageId: "hex", data: { value: m[0] } });
          },
        };
      },
    },

    "no-raw-tailwind-palette": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Detecta classes Tailwind cores cruas (text-gray-500, bg-zinc-100, etc); prefira tokens semanticos.",
        },
        messages: {
          raw: "Classe '{{cls}}' usa palette crua. {{hint}}",
        },
        schema: [],
      },
      create(context) {
        function check(node, value) {
          if (typeof value !== "string") return;
          const m = value.match(RAW_PALETTE_RE);
          if (!m) return;
          const cls = m[0];
          const hint = SEMANTIC_REPLACEMENTS[cls]
            ? `Substitua por '${SEMANTIC_REPLACEMENTS[cls]}'.`
            : "Substitua por um token semantico (text-foreground, bg-muted, border-border, etc) ou justifique com // ds-allow.";
          context.report({ node, messageId: "raw", data: { cls, hint } });
        }
        return {
          Literal(node) {
            check(node, node.value);
          },
          TemplateElement(node) {
            check(node, node.value && node.value.raw);
          },
          JSXAttribute(node) {
            if (
              node.name &&
              node.name.name === "className" &&
              node.value
            ) {
              if (node.value.type === "Literal")
                check(node, node.value.value);
            }
          },
        };
      },
    },
  },
};
