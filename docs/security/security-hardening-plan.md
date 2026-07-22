# Plano de Endurecimento de Seguranca

- [x] P0: falhar na inicializacao sem `BETTER_AUTH_SECRET`; nunca gerar ou usar fallback.
- [ ] P1: atualizar Better Auth apos revisar breaking changes e cobrir login, callback OAuth, logout e sessao revogada.
- [ ] P1: adicionar testes permitidos, negados e fora de escopo para rotas, comandos, jobs e exports por empresa.
- [ ] P1: confirmar que Evolution tem autenticacao de webhook equivalente ao contrato do provider e testar replay.
- [ ] P2: executar imagens como usuario nao-root e revisar necessidade de migrations no comando de start.
- [ ] P2: validar MIME, tamanho, extensao e destino privado para cada rota de upload; aplicar protecao SSRF a URLs configuraveis.
- [ ] P2: triar Nodemailer, Sharp e Picomatch sem `npm audit fix --force`.
- [ ] P3: definir retencao de logs/auditoria e redacao sistematica de PII.

O CI atual agenda `npm audit`, Gitleaks e Trivy. Os resultados locais devem ser comparados com ele, nao substituidos.
