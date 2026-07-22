# Plano de Endurecimento de Segurança (Security Hardening Plan)

## 1. Sessão e Autenticação
- [x] Configuração de cookies de sessão com sinalizadores `HttpOnly`, `Secure` (em produção) e `SameSite=Lax`.
- [ ] Implementação de rotação automática de tokens e revogação de sessão via redis/banco no logout.
- [ ] Aplicação de Rate Limiting via `ThrottlerModule` (30 req/s limite curto, 300 req/min limite médio) em endpoints de autenticação e recuperação de conta.

## 2. Isolamento Multiempresa
- [ ] Validação obrigatória do `companyId` no backend (`AuthorizationService`), impedindo que IDs passados pelo cliente acessem recursos de outras empresas.
- [ ] Implementação de testes automatizados de autorização negativa (`tests/user-access` e `tests/cadastros`).

## 3. Validação de Entrada e Respostas de Erro
- [ ] Validação de schemas com Zod em todas as bordas (Server Actions e NestJS Controllers).
- [ ] Ocultação de stack traces e mensagens de erro internas em produção (`NODE_ENV=production`), retornando envelopes estruturados (`ActionErrorResponse`).

## 4. Atualização de Dependências Críticas
- [ ] Atualização do `next` para versão com correção de bypass de middleware e DoS em Server Components.
- [ ] Atualização do `nodemailer` e `multer`/`@nestjs/platform-express` para mitigar vulnerabilidades de injeção CRLF e DoS por anexo.
