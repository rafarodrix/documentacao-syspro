#!/usr/bin/env bash
# Trilink DS — auditoria de violacoes.
# Roda na raiz do monorepo. Saida: ./design-audit/<arquivo>.txt
# Cada arquivo lista <path>:<linha>:<match>. Uma linha = uma violacao.
#
# Uso:
#   bash adoption/audit.sh
#   bash adoption/audit.sh apps/web/src   # escopa a um diretorio

set -euo pipefail
ROOT="${1:-.}"
OUT="design-audit"
mkdir -p "$OUT"

# Excluir build artifacts e o proprio pacote ui (a fonte da verdade).
EXCLUDE='--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=.turbo --exclude-dir=packages/ui'

echo "Auditando $ROOT ..."

# 1) Hex colors hardcoded em codigo (.ts/.tsx/.js/.jsx/.css/.scss)
grep -RInE $EXCLUDE \
  --include='*.{ts,tsx,js,jsx,css,scss,mdx}' \
  '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\b' "$ROOT" \
  | grep -vE '/(public|assets|img|fonts)/' \
  | grep -v 'ds-allow' \
  > "$OUT/01-hex-colors.txt" || true

# 2) Tailwind palette cores cruas (deveriam vir de tokens semanticos)
grep -RInE $EXCLUDE \
  --include='*.{ts,tsx,js,jsx,html,mdx}' \
  '\b(text|bg|border|ring|from|to|via|fill|stroke|divide|outline|placeholder|caret|accent|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b' "$ROOT" \
  | grep -v 'ds-allow' \
  > "$OUT/02-tailwind-raw-palette.txt" || true

# 3) Inline styles (escapam ao token system)
grep -RInE $EXCLUDE \
  --include='*.{tsx,jsx}' \
  'style=\{\{' "$ROOT" \
  > "$OUT/03-inline-styles.txt" || true

# 4) font-family arbitrario (deveria usar var(--font-sans))
grep -RInE $EXCLUDE \
  --include='*.{ts,tsx,js,jsx,css,scss}' \
  "font-family[: ]+['\"]" "$ROOT" \
  | grep -viE 'var\(--font' \
  > "$OUT/04-font-family-arbitrary.txt" || true

# 5) Componentes de UI construidos a mao (deveriam vir de @dosc-syspro/ui)
#    Heuristica: arquivos que NAO importam de @dosc-syspro/ui mas declaram
#    Button/Card/Badge/Input/Dialog locais.
grep -RIlE $EXCLUDE \
  --include='*.{tsx,jsx}' \
  'function (Button|Card|Badge|Input|Dialog|Tabs|Select|Tooltip)\b' "$ROOT" \
  | xargs -I{} sh -c 'grep -L "@dosc-syspro/ui" "{}" || true' \
  > "$OUT/05-local-ui-components.txt" || true

# 6) Imports de components/ui/* (alias @/ ou caminho relativo) — BLOQUEANTE
grep -RInE $EXCLUDE \
  --include='*.{ts,tsx,js,jsx}' \
  "from ['\"](@/|[.]{1,2}/[./]*)components/ui/" "$ROOT" \
  > "$OUT/06-shadcn-passthrough-imports.txt" || true

# 7) Spacing magico (margem/padding em px hardcoded)
grep -RInE $EXCLUDE \
  --include='*.{ts,tsx,js,jsx,css,scss}' \
  '(margin|padding)[^:]*:[^;]*[0-9]+px' "$ROOT" \
  > "$OUT/07-magic-spacing-px.txt" || true

# 8) shadow-* arbitrario fora dos tokens
grep -RInE $EXCLUDE \
  --include='*.{ts,tsx,js,jsx,css,scss}' \
  'box-shadow:[^;]*[0-9]+px' "$ROOT" \
  > "$OUT/08-magic-shadows.txt" || true

# Resumo
echo ""
echo "===== RESUMO ====="
for f in "$OUT"/*.txt; do
  count=$(wc -l < "$f" | tr -d ' ')
  printf "%5d  %s\n" "$count" "$(basename "$f")"
done
echo ""
echo "Detalhes em: $OUT/"

# Regra dura: imports passthrough sao proibidos — todos devem vir de @dosc-syspro/ui
PASSTHROUGH=$(wc -l < "$OUT/06-shadcn-passthrough-imports.txt" | tr -d ' ')
if [ "$PASSTHROUGH" -gt 0 ]; then
  echo ""
  echo "ERRO: $PASSTHROUGH import(s) de @/components/ui/* ainda existem."
  echo "Migre para @dosc-syspro/ui antes de fazer merge."
  cat "$OUT/06-shadcn-passthrough-imports.txt"
  exit 1
fi
