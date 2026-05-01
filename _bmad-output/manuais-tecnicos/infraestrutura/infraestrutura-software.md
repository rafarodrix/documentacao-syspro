# Infraestrutura de Software — Trilink Software

## Objetivo

Consolidar em um único documento o desenho atual de infraestrutura do Portal para operação e troubleshooting.

## Topologia atual (2026-05-01)

| Camada | Serviço | Provedor |
|--------|---------|----------|
| Frontend | `apps/web` (Next.js) | Vercel |
| Backend | `apps/api` (NestJS) | Railway |
| Servidor base (VPS) | Ubuntu 24.04 LTS | Contabo |
| RustDesk Server | instalado no host VPS | Contabo (mesmo da Evolution) |
| Evolution Go | container Docker | Contabo VPS |
| Nginx Proxy Manager | container Docker | Contabo VPS |
| Banco do portal | Prisma + PostgreSQL | Railway / Neon |
| Bancos Evolution Go | `evogo_auth`, `evogo_users` | Neon |

## Mapeamento de domínios (fonte de verdade)

| Subdomínio | Serviço | Host |
|------------|---------|------|
| `api.<dominio>` | Evolution Go | VPS Contabo |
| `acesso.<dominio>` | RustDesk | VPS Contabo |
| `backend.<dominio>` | NestJS `apps/api` | Railway |

> **Separação obrigatória:** não reutilizar `api.<dominio>` (Evolution) para o backend NestJS. O web deve apontar para `backend.<dominio>/api`.

## Escopo por camada

### 1. Servidor (host)

- Provedor: Contabo VPS
- Sistema operacional: Ubuntu 24.04 LTS
- RustDesk em operação no mesmo servidor da stack Evolution/Nginx

### 2. Rede e segurança

- Nginx Proxy Manager recebe tráfego de internet (80/443)
- SSL/TLS automatizado por Let's Encrypt
- Roteamento de host:
  - `api.<dominio>` → Evolution Go (container interno)
  - `acesso.<dominio>` → RustDesk (host)

### 3. Aplicação (containers)

- Evolution Go (v2) em Docker
- Configuração por `.env` com chaves e conexões externas
- Persistência fora do container (Neon), permitindo recriação segura do serviço

### 4. Dados

- Provider: Neon (PostgreSQL serverless)
- Bancos separados para Evolution:
  - `AUTH_DB` → `evogo_auth`
  - `USERS_DB` → `evogo_users`

## Operação do proxy (Nginx)

- Painel: `http://85.239.248.141:81/nginx/proxy`
- Regra recomendada:
  - publicar Evolution via host dedicado com TLS
  - manter RustDesk no host próprio
  - não expor `:8080` da Evolution diretamente para a internet
  - encaminhar tráfego externo de `api.<dominio>` para o container Evolution via rede interna Docker

## Variáveis críticas por runtime

### Vercel (`apps/web`)

```env
APP_BACKEND_API_URL=https://backend.<dominio>/api
APP_API_URL=https://backend.<dominio>/api
INTERNAL_API_KEY=<chave-compartilhada-com-api>
```

> `APP_API_URL` é a variável legada, ainda suportada. Preferir `APP_BACKEND_API_URL` em novas configurações.

### Railway (`apps/api`)

```env
DATABASE_URL=
INTERNAL_API_KEY=
EVOLUTION_API_URL=https://api.<dominio>
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
EVOLUTION_WEBHOOK_SECRET=
```

### Evolution Go (VPS)

```env
SERVER_URL=https://api.<dominio>
GLOBAL_API_KEY=
POSTGRES_AUTH_DB=...sslmode=require
POSTGRES_USERS_DB=...sslmode=require
```

## Regras de integração

1. Web chama somente backend NestJS (`backend.<dominio>/api`).
2. Backend NestJS chama Evolution Go quando necessário (`api.<dominio>`).
3. Evolution envia webhook diretamente para o backend NestJS.
4. RustDesk permanece isolado no host `acesso.<dominio>`.

## Fluxo de comunicação

```
Cliente → backend.<dominio>/api (Railway / NestJS)
       → api.<dominio> (Nginx → Evolution Go → Neon)
       ← webhook inbound → backend NestJS
```

1. Cliente (browser ou Server Action do `apps/web`) chama `https://backend.<dominio>/api`.
2. Backend NestJS processa e, quando necessário, chama `https://api.<dominio>` (Evolution).
3. Nginx Proxy Manager valida TLS e roteia para o container Evolution.
4. Evolution processa requisição e persiste eventos/estado no Neon.
5. Em eventos inbound, Evolution publica webhook diretamente para o backend NestJS no Railway.

## Controles de segurança

- Evolution sem exposição pública direta na `:8080` (acesso via proxy)
- TLS na borda com certificado automatizado (Let's Encrypt)
- `apikey` e segredos de ambiente para integração entre serviços
- CORS restrito apenas para origens autorizadas

## Manutenção recomendada

- Aplicar reboot da VPS após atualização de kernel/segurança
- Backup periódico dos diretórios operacionais:
  - `~/evolution-go`
  - `~/nginx-proxy`
- Validar rotação de chaves (`GLOBAL_API_KEY`, `INTERNAL_API_KEY`, `EVOLUTION_WEBHOOK_SECRET`) em janela controlada

## Checklist de validação rápida

- [ ] `acesso.<dominio>` responde RustDesk
- [ ] `api.<dominio>` responde Evolution
- [ ] `backend.<dominio>/api` responde NestJS
- [ ] `apps/web` abre conversas e tickets via backend
- [ ] Webhook inbound da Evolution chega no endpoint do NestJS
