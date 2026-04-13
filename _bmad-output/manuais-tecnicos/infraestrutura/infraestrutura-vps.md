# Infraestrutura hardware Trilink Software

# Introdução

Este guia define o padrão oficial da Trilink para operação de infraestrutura baseada em **Traefik v3 + Dokploy**.

O objetivo é garantir:

- Roteamento previsível
- SSL confiável (Let's Encrypt)
- Padronização entre ambientes
- Facilidade de diagnóstico

---

# Docker: Entendendo Containers vs Services

## Por que isso é importante?

Misturar **containers comuns** com **services (Swarm)** é a principal causa de:

- erros de roteamento no Traefik
- falhas de SSL
- comportamento inconsistente no deploy

---

## Identificação rápida

### 1. Containers comuns

```bash
docker ps
````

Se aparecer aqui → é container gerenciado diretamente.

---

### 2. Services (Docker Swarm)

```bash
docker service ls
```

Se aparecer aqui → é gerenciado pelo Swarm.

---

### 3. Verificação definitiva

```bash
docker inspect <container_id> --format '{{.Config.Labels}}'
```

Se retornar:

```bash
com.docker.swarm.service.name=...
```

👉 É um container pertencente a um service.

---

## Regra de ouro

| Tipo          | Gerenciamento correto |
| ------------- | --------------------- |
| Container     | docker / compose      |
| Compose       | docker compose        |
| Swarm Service | docker service        |

---

## Padrão de identificação visual

Exemplo:

```
portal-backend.1.xcfenref0guhn1f34q3njzfu4
```

Significa:

* `.1` → réplica
* sufixo aleatório → task do Swarm

👉 Isso é **100% Swarm**

---

## Erro comum

Achar que isso:

```bash
docker ps
```

mostra apenas containers comuns.

❌ ERRADO

👉 Mostra também **tasks do Swarm**

---

## Operação correta

### Para services

```bash
docker service update ...
docker service ps <nome>
```

### NÃO usar

```bash
docker restart
docker container update
```

---

# Traefik v3 + Dokploy

## Visão Geral

O Traefik atua como **reverse proxy central** e precisa enxergar:

* containers comuns (Compose)
* services (Swarm)

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

Sempre garantir:

```yaml
traefik.docker.network=dokploy-network
```

Sem isso:
👉 Traefik não enxerga o container

---

# Padrão Oficial Trilink

## ❌ Evitar

* misturar labels manuais + Domains do Dokploy
* usar Application quando não precisa de Swarm
* expor portas desnecessárias (`3000:3000`)
* múltiplas definições de serviço no Traefik

---

## ✅ Recomendado

| Tipo de app          | Padrão                   |
| -------------------- | ------------------------ |
| Backend próprio      | Compose                  |
| Chatwoot / Evolution | Compose                  |
| Infra core           | separado                 |
| Swarm                | apenas quando necessário |

---

# A Bíblia das Labels (Traefik)

## Problema clássico

```
too many services
```

---

## Solução padrão

Sempre declarar serviço explicitamente:

```yaml
- traefik.http.routers.backend.rule=Host(`backend.trilink.com.br`)
- traefik.http.routers.backend.service=backend-svc
- traefik.http.services.backend-svc.loadbalancer.server.port=3000
```

---

## Regra crítica

👉 1 router = 1 service

Nunca deixe o Traefik inferir automaticamente.

---

# Padrões de Implementação

## Docker Compose (Recomendado)

```yaml
services:
  backend:
    build: .
    expose:
      - "3000"
```

👉 Labels ficam no serviço

---

## Docker Swarm

```yaml
deploy:
  labels:
    - traefik.enable=true
```

👉 Labels ficam dentro de `deploy`

---

# Diagnóstico Rápido

## 1. Rota não funciona (404)

* verificar dashboard Traefik (`:8081`)
* roteador existe?

Se não:
👉 problema de label ou provider

---

## 2. Bad Gateway / Timeout

Causas:

* porta errada
* container fora da rede
* app não subiu

---

## 3. Too many services

Causa:

* múltiplos serviços detectados

Solução:

```yaml
router.service=nome
```

---

## 4. SSL não funciona

Checklist:

* DNS apontando correto
* porta 80 aberta
* `acme.json` com permissão 600

```bash
chmod 600 /opt/traefik/letsencrypt/acme.json
```

---

# Boas práticas operacionais

## Evitar containers fantasmas

Sempre que alterar estrutura:

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

## Debug avançado

```bash
curl -I http://dominio
curl -Iv https://dominio
```

---

# Conclusão

O segredo da estabilidade está em:

* padronização
* evitar mistura de modelos
* controle explícito do Traefik

---

> 💡 **Princípio Trilink:**
> “Se não está explícito, está errado.”

```
