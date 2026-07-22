# Modelo de Ameacas do Portal Trilink

| Ativo/superficie | Ameaca | Controle verificado | Risco residual |
| --- | --- | --- | --- |
| Dados por empresa | IDOR e escopo forjado | `AuthorizationService` resolve permissoes globais ou por `companyId`; testes de tickets cobrem escopo negado | cobertura negativa ainda nao e sistematica para todas as rotas, jobs e exports |
| Sessao | segredo previsivel ou sessao invalida | Better Auth e cookies de sessao | fallback local de `BETTER_AUTH_SECRET` e vulnerabilidade critica do pacote |
| Webhooks Chatwoot | replay ou forja | assinatura HMAC, timestamp e deduplicacao | exigir testes de replay em todos os providers |
| Webhooks Evolution | instancia/token indevidos | conexao ativa e token da instancia validados | verificar cobertura de assinatura quando provider a suportar |
| Uploads/integracoes | SSRF, leitura de arquivo ou vazamento | R2 e URLs assinadas previstos; secrets criptografados em conexoes | dependencia Nodemailer vulneravel e limites precisam ser revisados por endpoint |
| Build/deploy | segredo no build e imagem privilegiada | CI executa audit, Gitleaks e Trivy; imagens usam Node Alpine | Dockerfiles nao definem `USER` nao-root |

Prioridade imediata: eliminar fallback de segredo, corrigir Better Auth com plano de compatibilidade e expandir testes negativos de empresa para todas as bordas mutaveis.
