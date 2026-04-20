# Evolution Go: Canal WhatsApp

## Objetivo

Este manual descreve o estado operacional atual da integracao WhatsApp baseada em Evolution Go.

O fluxo vigente nao usa um bridge separado. O `apps/api` e o ponto central de orquestracao entre Evolution Go, Chatwoot e o banco da aplicacao; o `apps/web` apenas expoe configuracao e operacao administrativa.

```text
WhatsApp
  -> Evolution Go
  -> POST /api/webhooks/evolution
  -> apps/api
  -> Chatwoot

Chatwoot
  -> POST /api/webhooks/chatwoot
  -> apps/api
  -> Evolution Go
  -> WhatsApp
```

<Callout type="info" title="Estado atual em 2026-04-20">
  A arquitetura real ja opera com backend central em `apps/api`. `apps/whatsapp-bridge` e fila dedicada continuam sendo possibilidades futuras, mas nao sao dependencias do fluxo atual.
</Callout>

## Responsabilidades por camada

### Evolution Go

- mantem a sessao WhatsApp;
- recebe comandos de envio em `/send/text` e `/send/media`;
- publica eventos no webhook do backend;
- entrega midia no payload do webhook quando configurado para isso, ou por URL quando a instalacao expoe o arquivo.

### `apps/api`

- recebe `POST /api/webhooks/evolution`;
- resolve a conexao ativa por `instanceId`, `instance`, fallback de conexao unica ou configuracao de ambiente;
- valida `instanceToken` quando configurado;
- encaminha mensagens inbound para o Chatwoot;
- encaminha respostas do Chatwoot para a Evolution;
- aplica deduplicacao por mensagem/evento;
- mantem vinculos locais em `conversation_link`, `message_link`, `integration_webhook_dedup` e `company_contact`.

### `apps/web`

- exibe a tela administrativa em `Configuracoes > WhatsApp / Evolution Go`;
- persiste `webhookUrl`, `subscribe`, `immediate`, `phone`, `instance`, `instanceId` e `instanceToken`;
- nao recebe webhooks diretamente;
- nao deve conter regra de negocio do canal.

## Endpoints internos

| Direcao | Endpoint | Funcao |
| --- | --- | --- |
| Evolution -> backend | `POST /api/webhooks/evolution` | Recebe mensagens, recibos e chamadas. |
| Chatwoot -> backend | `POST /api/webhooks/chatwoot` | Recebe respostas do agente e eventos da conversa. |
| Portal -> backend | `GET /api/settings/evolution` | Le configuracao administrativa da Evolution. |
| Portal -> backend | `PUT /api/settings/evolution` | Salva configuracao administrativa da Evolution. |
| Portal -> backend | `POST /api/settings/integrations/connections/:id/test` | Testa Evolution/Chatwoot e pode reaplicar `/instance/connect`. |
| Backend -> Evolution | `POST /send/text` | Envia texto para WhatsApp. |
| Backend -> Evolution | `POST /send/media` | Envia midia para WhatsApp. |
| Backend -> Evolution | `GET /instance/status` | Teste de conectividade da instancia. |
| Backend -> Evolution | `POST /instance/connect` | Provisionamento/reaplicacao de webhook quando ha `webhookUrl` nos metadados. |

## Configuracao recomendada no Evolution

Webhook URL:

```text
https://backend.<dominio>/api/webhooks/evolution
```

Eventos assinados:

- preferencial: `ALL`;
- minimo para operacao 1:1: `MESSAGE` e `READ_RECEIPT`;
- se grupos forem assinados separadamente no Evolution Go 0.7.0 ou superior: incluir `GROUP`;
- `CALL` e aceito pelo backend para registrar eventos de ligacao;
- `NEWSLETTER` e conhecido pelo contrato, mas o backend atual ignora esse JID operacionalmente.

<Callout type="warn" title="Evolution Go 0.7.0">
  A partir do `0.7.0`, eventos de chats `@g.us` podem ser roteados para assinantes `GROUP` quando `MESSAGE`, `SEND_MESSAGE` ou `READ_RECEIPT` nao estiverem presentes. Por isso, instancias que nao usam `ALL` devem assinar `GROUP` para preservar mensagens de grupos permitidos.
</Callout>

## Configuracao no portal

A tela `WhatsApp / Evolution Go` salva a configuracao administrativa em `evolution_config`.

Campos relevantes:

- `Webhook URL`: URL publica do backend.
- `Subscribe`: lista enviada para a Evolution em provisionamento.
- `Immediate`: deve ficar ativo salvo necessidade operacional especifica.
- `Phone`: numero usado em pareamento manual ou provisionamento.
- `Instance`: nome/alias da instancia.
- `Instance ID`: identificador da instancia quando disponivel.
- `Instance Token`: token opcional exigido pelo backend quando a Evolution envia `instanceToken`.

Para multiplas integracoes, a fonte principal passa a ser `integration_connection`, com credenciais Evolution e Chatwoot criptografadas. A resolucao do webhook tenta casar `instanceId` ou `instance`; se houver grupo permitido, tambem usa o JID do grupo para selecionar a conexao correta.

## Variaveis de ambiente do backend

Obrigatorias quando a integracao usa fallback de ambiente:

```text
EVOLUTION_API_URL
EVOLUTION_API_KEY
EVOLUTION_INSTANCE
CHATWOOT_URL
CHATWOOT_ACCOUNT_ID
CHATWOOT_API_TOKEN
CHATWOOT_INBOX_ID
```

Opcionais:

```text
EVOLUTION_INSTANCE_TOKEN
CHATWOOT_INBOX_IDENTIFIER
CHATWOOT_PLATFORM_API_TOKEN
CHATWOOT_WEBHOOK_SECRET
CHATWOOT_WEBHOOK_MAX_SKEW_SECONDS
CHATWOOT_INCOMING_MEDIA_MODE
R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_BASE_URL
R2_SIGNED_URL_TTL_SECONDS
INTEGRATION_WEBHOOK_DEDUP_TTL_SECONDS
```

## Eventos processados pelo webhook Evolution

| Evento | Tratamento atual |
| --- | --- |
| `MESSAGE` / `message` | Mensagem inbound comum. |
| `messages.upsert` | Mensagem inbound em formato compativel com baileys/whatsmeow. |
| `GROUP` / `group` | Tratado como mensagem inbound quando o JID termina em `@g.us` e o payload possui conteudo de mensagem. |
| `READ_RECEIPT` / `read_receipt` | Atualiza status no Chatwoot quando ha ID da mensagem. |
| `Receipt` / `receipt` | Compatibilidade com payload legado de recibo. |
| `messages.update` | Compatibilidade com atualizacao legada de status. |
| `CALL` e variacoes `call*` | Registra ligacao inbound no Chatwoot quando aplicavel. |
| Demais eventos | Ignorados com log de debug. |

## Mensagens de grupo

O backend aceita grupos apenas por allowlist configurada na conexao.

Metadados aceitos em `integration_connection.metadata`:

```json
{
  "evolution": {
    "allowedGroupJids": ["120363000000000000@g.us"],
    "allowedGroups": [
      { "jid": "120363000000000000@g.us", "name": "Suporte Cliente A" }
    ]
  }
}
```

Regras:

- mensagem de grupo fora da allowlist e ignorada;
- grupo permitido gera ou reutiliza conversa no Chatwoot;
- a mensagem recebe prefixo com nome/numero do participante;
- chamadas de grupo sao ignoradas.

## Midia

Inbound:

- imagens, videos, documentos e audios sao detectados no payload;
- o backend aceita `base64`, `data:` URL ou URL publica;
- quando R2 esta configurado, o backend sobe a midia para o bucket e envia URL publica ao Chatwoot;
- se o payload nao trouxer binario nem URL acessivel, o texto/caption segue e a midia e registrada como ausente em log.

Configuracao importante no Evolution:

- use a variavel/runtime correto `WEBHOOK_FILES` na Evolution Go quando a intencao for enviar arquivos no webhook;
- o release `0.7.0` corrigiu documentacao que ainda citava `WEBHOOKFILES`.

Outbound:

- texto usa `/send/text`;
- midia usa `/send/media`;
- o campo `url` enviado para `/send/media` aceita URL HTTP(S), base64 puro ou `data:*;base64,...`;
- essa compatibilidade cobre o suporte a base64 do Evolution Go 0.7.0.

## Seguranca

- nao reutilizar `api.<dominio>` da Evolution para o backend Nest;
- publicar o backend em dominio proprio, por exemplo `backend.<dominio>`;
- manter Evolution atras do Nginx Proxy Manager, sem expor porta interna diretamente;
- usar HTTPS/TLS nas URLs publicas;
- preencher `instanceToken` somente quando a instancia realmente envia esse campo no webhook;
- configurar `CHATWOOT_WEBHOOK_SECRET` para validacao do webhook Chatwoot;
- nao promover contato inbound diretamente para `User`.

## Deduplicacao e vinculos

Persistencias locais usadas pelo fluxo:

- `conversation_link`: vincula WhatsApp/grupo a conversa Chatwoot por conexao;
- `message_link`: vincula ID da mensagem Evolution ao ID da mensagem Chatwoot;
- `integration_webhook_dedup`: evita reprocessamento de eventos repetidos;
- `company_contact`: mantem identidade operacional do contato.

Mensagens outbound geradas pelo proprio backend sao ignoradas quando retornam como eco da Evolution.

## Limites atuais

- `NEWSLETTER` esta no contrato de subscribe, mas nao e encaminhado ao Chatwoot;
- mensagens interativas, botoes, listas, carrossel e status do WhatsApp do Evolution Go 0.7.0 ainda nao possuem UI/caso de uso no portal;
- `apps/whatsapp-bridge` e fila Redis/BullMQ seguem fora do fluxo atual;
- Chatwoot continua sendo a interface primaria de atendimento, enquanto o portal controla configuracao, vinculo e auditoria.

## Checklist minimo de operacao

1. `api.<dominio>` aponta para Evolution Go.
2. `backend.<dominio>` aponta para `apps/api`.
3. Evolution envia webhook para `https://backend.<dominio>/api/webhooks/evolution`.
4. Subscribe usa `ALL` ou pelo menos `MESSAGE`, `READ_RECEIPT` e, se houver grupos, `GROUP`.
5. `Instance`/`Instance ID` no portal ou em `integration_connection` batem com o payload da Evolution.
6. Chatwoot envia webhook para `https://backend.<dominio>/api/webhooks/chatwoot`.
7. Para midia inbound, Evolution esta com `WEBHOOK_FILES` coerente e R2 esta configurado quando o modo desejado for URL publica.

## Relacao com outros manuais

- Integracao Chatwoot: [`_bmad-output/manuais-tecnicos/integracoes/chatwoot.md`](./chatwoot.md)
- Infraestrutura de software: [`_bmad-output/manuais-tecnicos/infraestrutura/infraestrutura-software.md`](../infraestrutura/infraestrutura-software.md)
- Infraestrutura VPS: [`_bmad-output/manuais-tecnicos/infraestrutura/infraestrutura-vps.md`](../infraestrutura/infraestrutura-vps.md)
