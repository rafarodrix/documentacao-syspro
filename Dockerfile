FROM node:20-alpine AS builder

# Instala o OpenSSL para o Prisma funcionar corretamente no Alpine
RUN apk update && apk add --no-cache openssl

WORKDIR /app

# Copia os arquivos de configuração do workspace
COPY package*.json ./
COPY tsconfig*.json ./

# Copia apenas o app da API e os packages (ignora o frontend)
COPY apps/api ./apps/api
COPY packages ./packages

# Instala as dependências focadas apenas na API e nos pacotes base
RUN npm ci -w @dosc-syspro/app-api --include-workspace-root

# Gera o Prisma Client do pacote de banco de dados
RUN npm run db:generate

# Faz o build apenas do backend (NestJS)
RUN npm run build -w @dosc-syspro/app-api

FROM node:20-alpine AS runner

# Garante que o OpenSSL também esteja no contêiner final para o Prisma conectar ao banco
RUN apk update && apk add --no-cache openssl

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