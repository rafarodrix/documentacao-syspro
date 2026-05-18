# Política de Segurança

## Reportando uma Vulnerabilidade

Se você encontrou uma vulnerabilidade de segurança neste projeto, **não abra uma issue pública**.

Reporte de forma privada através de uma das opções abaixo:

- **GitHub Security Advisories**: use a aba "Security" → "Report a vulnerability" neste repositório
- **E-mail**: entre em contato diretamente com o time de plataforma

### O que incluir no relatório

- Descrição da vulnerabilidade e impacto potencial
- Passos para reproduzir (exploit proof-of-concept, se houver)
- Versão/commit afetado
- Sugestão de correção (opcional)

### Processo de resposta

1. Confirmação de recebimento em até **2 dias úteis**
2. Avaliação de severidade e impacto em até **5 dias úteis**
3. Correção e publicação de patch seguindo a criticidade (crítico: 48h, alto: 7d, médio: 30d)
4. Crédito público ao pesquisador após o patch (se desejado)

---

## Áreas de maior atenção

- Autenticação e sessão (`better-auth`, tokens JWT, agentToken)
- Controle de acesso por empresa/tenant
- Acesso remoto (RustDesk integration, tokens de sessão)
- Endpoints de API com dados sensíveis (NF-e, dados fiscais)
- Variáveis de ambiente e segredos em CI/CD

---

## Fora do escopo

- Ataques que requerem acesso físico à máquina
- Vulnerabilidades em dependências sem PoC aplicável ao projeto
- Problemas de configuração de infraestrutura do cliente final
