FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/api ./apps/api
COPY packages ./packages

RUN npm pkg delete scripts.postinstall
RUN npm install -w @dosc-syspro/app-api --include-workspace-root --no-audit --no-fund

RUN npm run db:generate
RUN npm run build -w @dosc-syspro/app-api

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]