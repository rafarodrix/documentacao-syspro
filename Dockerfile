FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de configuração do workspace
COPY package*.json ./
COPY tsconfig*.json ./

# Copia os apps e packages do monorepo
COPY apps ./apps
COPY packages ./packages

# Instala as dependências (isso criará os symlinks dos workspaces)
RUN npm install

# Gera o Prisma Client do pacote de banco de dados
RUN npm run db:generate

# Faz o build apenas do backend (NestJS)
RUN npm run build -w @dosc-syspro/app-api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copia os arquivos essenciais do builder
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copia a pasta de pacotes (necessário pois o node_modules usa symlinks para eles)
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]