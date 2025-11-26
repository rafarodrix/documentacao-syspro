# Documentação do Syspro ERP - Trilink Software

Este guia abrange a integração, customização e uso do Syspro ERP, um sistema de planejamento de recursos empresariais (ERP) voltado para manufatura, distribuição e gestão financeira. Nosso objetivo é ajudar você a implementar e gerenciar o Syspro ERP de forma eficiente.

# Contato e Suporte
Suporte Técnico: rafael@trilink.com.br

Telefone: +55 (34) 99771-3731

Site: www.trilink.com.br

Horário de Atendimento: Segunda a Sexta, das 8h às 18h (horário de Brasília).

# Inicie o servidor de desenvolvimento

```bash
npm run dev

```

# ALterações no Prisma
## 1. Atualiza o banco de dados com a nova tabela Contract
npx prisma db push

## 2. (Opcional) Se o autocomplete não funcionar, force a geração dos tipos
npx prisma generate

## 3. Inicie o projeto novamente
npm run dev

Abra http://localhost:3000 no seu navegador para ver o resultado.

# Saiba Mais

Para aprender mais sobre Next.js e Fumadocs, confira os seguintes recursos:

- [Next.js Documentation](https://nextjs.org/docs) -  Documentação sobre as funcionalidades e a API do Next.js.
- [Learn Next.js](https://nextjs.org/learn) - Tutorial interativo sobre Next.js.
- [Fumadocs](https://fumadocs.vercel.app) -  Documentação sobre o Fumadocs.