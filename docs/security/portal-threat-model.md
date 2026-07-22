# Modelo de Ameaças do Portal Trilink (Threat Model)

## 1. Visão Geral do Sistema
O Portal Trilink Syspro é uma plataforma ERP web multiempresa integrada a agentes locais Windows, gateways de mensagens (Evolution API/Chatwoot) e microsserviços de mensageria.

---

## 2. Superfícies de Ataque e Ameaças Principais

### 2.1 Isolamento Multiempresa (Multi-Tenant Bypasses / IDOR)
- **Vetor:** Alteração de parâmetros HTTP (`companyId`, `tenantId`, `ticketId`) em chamadas Server Action ou endpoints REST/tRPC.
- **Risco:** Acesso não autorizado a dados de empresas concorrentes ou vazamento de segredos/chaves de API de terceiros.
- **Mitigação Exigida:** Resolução e validação obrigatória do escopo da empresa (`CompanyScope`) no backend/NestJS para TODA requisição autenticada (Deny-by-Default).

### 2.2 Autorização Exclusiva no Frontend
- **Vetor:** Ocultação de elementos visuais no Next.js enquanto as rotas de backend permanecem expostas sem checagem de permissões (`Role`/`Permissions`).
- **Risco:** Usuários com perfil `CLIENTE_USER` executando ações administrativas de `ADMIN` ou `DEVELOPER`.
- **Mitigação Exigida:** Guardas de autorização (`APP_GUARD`, `RolesGuard`, `PermissionsGuard`) ativos no NestJS em todas as rotas e procedimentos tRPC.

### 2.3 Exposição de Segredos e Credenciais
- **Vetor:** Inclusão acidental de variáveis `.env` de produção, chaves JWT, ou tokens de gateway em arquivos comitados ou respostas de erro HTTP (Stack Trace).
- **Risco:** Comprometimento total da infraestrutura ou interceptação de mensagens de clientes.
- **Mitigação Exigida:** Uso de `LoggerModule` Pino redigindo headers sensíveis, sanitização de respostas de erro em ambiente produtivo, e validação via CI/CD.

### 2.4 Vulnerabilidade de Upload e SSRF
- **Vetor:** Envio de anexos de tickets ou arquivos fiscais sem verificação de MIME/extensão, ou fornecimento de URLs arbitrárias para pré-visualização.
- **Risco:** Execução de scripts nocivos ou requisições maliciosas internas a partir do servidor (SSRF).
- **Mitigação Exigida:** Validação estrita de extensão/tamanho, armazenamento em buckets S3 privados e geração de URLs pré-assinadas temporárias.
