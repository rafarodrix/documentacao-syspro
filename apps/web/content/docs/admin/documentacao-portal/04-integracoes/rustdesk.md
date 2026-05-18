# Integração: RustDesk

> Ferramenta open-source de acesso remoto integrada ao portal Trilink.
> Atualizado em: 2026-05-05

---

## O que é

RustDesk é o cliente/servidor de acesso remoto utilizado para conectar ao desktop de clientes Windows. O portal Trilink orquestra o ciclo de vida do RustDesk nos dispositivos gerenciados.

**A Trilink não modifica o RustDesk** — apenas o configura e gerencia via agente Go.

---

## Componentes da integração

```
Portal (apps/api)          Agent (Go)              RustDesk
      │                        │                       │
      │◄── heartbeat ──────────│                       │
      │──► config/commands ────│                       │
      │                        │──── configura ────────►│
      │                        │                       │
Técnico abre                   │          Técnico conecta via RustDesk client
sessão no portal               │          usando address book do portal
      │                        │◄──── acesso remoto ───│
      │◄── session events ─────│
```

---

## Servidor relay

O RustDesk usa um servidor relay próprio da Trilink para retransmitir conexões entre cliente e host:

```
relay.trilink.com.br  ← endereço do relay server
```

O agente recebe o endereço do relay server no bootstrap e o aplica na config do RustDesk local.

---

## Configuração aplicada pelo agente

No bootstrap, o portal envia uma config que o agente aplica no RustDesk:

```toml
# rustdesk-config.toml (aplicado pelo agente)
relay-server = "relay.trilink.com.br"
key = "<encryption-key>"
alias = "PC-CLIENTE-01"
```

O agente pode reaaplicar a config via comando `REAPPLY_CONFIG`.

---

## Address Book

O portal exporta um **address book** para o cliente RustDesk do técnico:

**Endpoint:** `GET /api/remote/rustdesk/address-book`

Retorna lista de hosts agrupados por empresa, com:
- `rustdeskId` para conexão direta
- Alias (nome amigável)
- Status operacional
- Empresa vinculada

### Credenciais de address book

```
GET  /api/remote/rustdesk/address-book/credentials
POST /api/remote/rustdesk/address-book/credentials
```

Escopos:
- `GLOBAL`: acesso a todos os hosts (apenas ADMIN/SUPORTE)
- `COMPANY`: acesso apenas aos hosts de uma empresa específica

Credenciais podem ser rotacionadas ou revogadas.

---

## Fluxo de sessão de acesso

```
1. Técnico abre sessão no portal
   POST /api/remote/sessions + { hostId }
   ← { sessionId, rustdeskId, credentials }

2. Técnico conecta no RustDesk client usando rustdeskId

3. Agente aceita conexão
   POST /api/remote/sessions/:id/start  (webhook do agente)

4. Sessão REQUESTED → STARTED

5. Técnico encerra a sessão (RustDesk ou portal)
   POST /api/remote/sessions/:id/stop
   Sessão STARTED → ENDED
```

**Nota no ticket:** Se a sessão foi iniciada a partir de um ticket, uma nota é adicionada automaticamente ao ticket com a duração e técnico responsável (`configureRemoteSessionTicketNoteHandler`).

---

## Proteção de credenciais

- `rustdeskId` é persistido **sem espaços** no banco
- `agentToken` cifrado com DPAPI no Windows
- Credenciais de address book têm scope e podem ser revogadas individualmente
- Rate limit em discovery: 5 req/min por IP
