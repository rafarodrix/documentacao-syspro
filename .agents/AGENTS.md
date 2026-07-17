# Regras de Governança do Monorepo Syspro

## Limpeza de Raiz (Root Cleanliness)

É estritamente proibido deixar arquivos residuais ou binários gerados na raiz de qualquer projeto (ex: `apps/agent`).
Ao trabalhar nos diretórios, siga estas diretrizes:

1. **Binários (`.exe`, `.dll`, etc.)**: Devem ser gerados e mantidos exclusivamente dentro de pastas como `build/`, `dist/` ou `.bin/`. Nunca devem ficar soltos na raiz.
2. **Scripts soltos (`.ps1`, `.sh`, `.bat`)**: Todos os scripts de configuração, limpeza ou deploy devem ser agrupados dentro de uma pasta `scripts/` correspondente ao seu módulo.
3. **Pastas Temporárias (`tmp-build`, `.tmp`)**: Se forem necessárias, devem ser configuradas para serem ignoradas via `.gitignore` e removidas por scripts de `clean`.
4. **Logs e dumps**: Nunca comitar ou deixar na raiz arquivos de log gerados em tempo de desenvolvimento.
