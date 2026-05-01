# Infraestrutura VPS — Trilink Software

## Introdução

Este guia define o padrão oficial da Trilink para operação de infraestrutura baseada em **Traefik v3 + Dokploy**.

O objetivo é garantir:

- Roteamento previsível
- SSL confiável (Let's Encrypt)
- Padronização entre ambientes
- Facilidade de diagnóstico

---

# Docker: Containers vs Services

## Por que isso importa

Misturar **containers comuns** com **services (Swarm)** é a principal causa de:

- Erros de roteamento no Traefik
- Falhas de SSL
- Comportamento inconsistente no deploy

---

## Identificação rápida

### Containers comuns

```bash
docker ps
```

Se aparecer aqui, é container gerenciado diretamente.

---

### Services (Docker Swarm)

```bash
docker service ls
```

Se aparecer aqui, é gerenciado pelo Swarm.

---

### Verificação definitiva

```bash
docker inspect <container_id> --format '{{.Config.Labels}}'
```

Se retornar `com.docker.swarm.service.name=...`, é um container pertencente a um service.

---

## Regra de ouro

| Tipo          | Gerenciamento correto |
| ------------- | --------------------- |
| Container     | `docker` / `compose`  |
| Compose       | `docker compose`      |
| Swarm Service | `docker service`      |

---

## Padrão de identificação visual

Exemplo de nome de task no Swarm:

```
portal-backend.1.xcfenref0guhn1f34q3njzfu4
```

- `.1` indica réplica
- Sufixo aleatório indica task do Swarm

Isso é 100% Swarm — não operar como container comum.

---

## Erro comum

`docker ps` mostra também as tasks do Swarm em execução, não apenas containers comuns. Não confundir os dois contextos.

---

## Operação correta para services

```bash
docker service update ...
docker service ps <nome>
```

Não usar `docker restart` ou `docker container update` em services Swarm.

---

# Traefik v3 + Dokploy

## Visão geral

O Traefik atua como reverse proxy central e precisa enxergar:

- Containers comuns (Compose)
- Services (Swarm)

---

## Configuração obrigatória (Traefik v3)

```yaml
command:
  - --providers.docker=true
  - --providers.swarm=true
  - --providers.docker.exposedbydefault=false
  - --providers.swarm.exposedbydefault=false
  - --entrypoints.web.address=:80
  - --entrypoints.websecure.address=:443
  - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
```

---

## Rede padrão

Sempre garantir a label de rede:

```yaml
traefik.docker.network=dokploy-network
```

Sem isso, o Traefik não enxerga o container.

---

# Padrão Oficial Trilink

## Evitar

- Misturar labels manuais com Domains do Dokploy
- Usar Application (Swarm) quando não há necessidade de Swarm
- Expor portas desnecessárias (`3000:3000`)
- Múltiplas definições de serviço no Traefik para o mesmo app

---

## Recomendado

| Tipo de app          | Padrão                   |
| -------------------- | ------------------------ |
| Backend próprio      | Compose                  |
| Chatwoot / Evolution | Compose                  |
| Infra core           | Separado                 |
| Swarm                | Apenas quando necessário |

---

# Labels do Traefik

## Problema clássico: `too many services`

Ocorre quando o Traefik detecta múltiplos serviços para o mesmo container sem declaração explícita.

---

## Solução padrão

Sempre declarar o serviço explicitamente:

```yaml
- traefik.http.routers.backend.rule=Host(`backend.<dominio>`)
- traefik.http.routers.backend.service=backend-svc
- traefik.http.services.backend-svc.loadbalancer.server.port=3000
```

---

## Regra crítica

1 router = 1 service. Nunca deixar o Traefik inferir automaticamente.

---

# Padrões de Implementação

## Docker Compose (recomendado)

Labels ficam no nível do serviço:

```yaml
services:
  backend:
    build: .
    expose:
      - "3000"
    labels:
      - traefik.enable=true
      - traefik.http.routers.backend.rule=Host(`backend.<dominio>`)
      - traefik.http.routers.backend.service=backend-svc
      - traefik.http.services.backend-svc.loadbalancer.server.port=3000
```

---

## Docker Swarm

Labels ficam dentro de `deploy`:

```yaml
deploy:
  labels:
    - traefik.enable=true
    - traefik.http.routers.backend.rule=Host(`backend.<dominio>`)
    - traefik.http.routers.backend.service=backend-svc
    - traefik.http.services.backend-svc.loadbalancer.server.port=3000
```

---

# Diagnóstico

## 1. Rota não funciona (404)

Verificar dashboard Traefik (`:8081`). Se o roteador não existir, o problema está na label ou no provider.

---

## 2. Bad Gateway / Timeout

Causas possíveis:

- Porta errada no label
- Container fora da rede `dokploy-network`
- Aplicação não subiu corretamente

---

## 3. Too many services

Causa: múltiplos serviços detectados para o mesmo container.

Solução: declarar `router.service=<nome>` explicitamente.

---

## 4. SSL não funciona

Checklist:

- DNS apontando para o IP da VPS
- Porta 80 aberta e acessível
- Arquivo `acme.json` com permissão correta:

```bash
chmod 600 /opt/traefik/letsencrypt/acme.json
```

---

# Boas práticas operacionais

## Evitar containers fantasmas

Após alterar estrutura de compose, remover containers antigos:

```bash
docker rm -f <container>
```

---

## Logs essenciais

```bash
docker logs traefik --tail 50
docker service logs dokploy --tail 50
```

---

## Debug de rota

```bash
curl -I http://<dominio>
curl -Iv https://<dominio>
```

---

# Conclusão

A estabilidade da infraestrutura depende de:

- Padronização de labels e redes
- Evitar mistura de modelos (Compose vs Swarm)
- Controle explícito do Traefik — nunca depender de inferência automática

> **Princípio Trilink:** "Se não está explícito, está errado."
