# Package: @dosc-syspro/shared

> Utilitários compartilhados entre apps. Atualizado em: 2026-05-05

---

## Responsabilidade

`@dosc-syspro/shared` exporta funções utilitárias sem lógica de domínio.

---

## Exports

```
packages/shared/src/
├── date.ts                    ← formatadores de data
├── currency.ts                ← formatadores de moeda BRL
├── formatters.ts              ← CNPJ, CPF, telefone, CEP, etc.
├── search.ts                  ← helpers de busca full-text
├── logger.ts                  ← logger estruturado
├── action-error-handler.ts    ← handler padronizado de erros em server actions
├── action-rate-limit.ts       ← rate limiting para server actions
├── request-auth.ts            ← HMAC-SHA256 para auth de API interna
├── remote-operational-status.ts ← resolve status operacional de host remoto
└── index.ts                   ← re-exporta tudo
```

---

## Funções principais

### Formatadores (`formatters.ts`, `currency.ts`, `date.ts`)

```typescript
formatCNPJ('12345678000195')    // '12.345.678/0001-95'
formatCPF('12345678901')        // '123.456.789-01'
formatPhone('11987654321')      // '(11) 98765-4321'
formatCEP('01310100')           // '01310-100'
formatCurrency(1234.56)         // 'R$ 1.234,56'
formatDate(new Date())          // '05/05/2026'
formatRelativeDate(date)        // 'há 2 horas'
```

### Logger (`logger.ts`)

```typescript
const logger = createLogger({ context: 'RemoteAdmin' })
logger.log('Host conectado', { hostId, rustdeskId })
logger.error('Falha no heartbeat', error)
logger.warn('Token expirando em breve', { expiresAt })
```

Logger estruturado compatível com o sistema de logging do NestJS.

### Auth de API interna (`request-auth.ts`)

```typescript
// Gerar assinatura HMAC-SHA256
const signature = computeHmacSha256Hex(payload, secret)

// Validar assinatura na API
const isValid = isValidHmacSignature(payload, signature, secret)
```

Usado em chamadas internas (Next.js API Routes → NestJS) que não passam pela autenticação do usuário.

### Rate limiting (`action-rate-limit.ts`)

```typescript
await consumeActionRateLimit({
  key: `discover:${ip}`,
  limit: 5,
  window: 60,  // segundos
})
// Lança TooManyRequestsException se exceder
```

### Status operacional remoto (`remote-operational-status.ts`)

```typescript
const status = resolveRemoteOperationalStatus({
  lastHeartbeatAt,
  hasActiveSession,
  agentToken,
  rustdeskId,
})
// Retorna: 'ONLINE' | 'RECENT' | 'OFFLINE' | 'MISCONFIGURED' | 'SESSION_BUSY'
```

Reutilizado tanto na API quanto no frontend.
