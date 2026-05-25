FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/api/package.json ./apps/api/package.json

COPY packages/config/package.json ./packages/config/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/features/crm/domain/package.json ./packages/features/crm/domain/package.json
COPY packages/features/remote/domain/package.json ./packages/features/remote/domain/package.json
COPY packages/features/remote/infra/package.json ./packages/features/remote/infra/package.json
COPY packages/features/tickets/domain/package.json ./packages/features/tickets/domain/package.json
COPY packages/features/tickets/infra/package.json ./packages/features/tickets/infra/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm pkg delete scripts.postinstall
RUN npm install -w @dosc-syspro/app-api --include-workspace-root --no-audit --no-fund

COPY apps/api ./apps/api

COPY packages/config ./packages/config
COPY packages/contracts ./packages/contracts
COPY packages/core ./packages/core
COPY packages/database ./packages/database
COPY packages/features/crm/domain ./packages/features/crm/domain
COPY packages/features/remote/domain ./packages/features/remote/domain
COPY packages/features/remote/infra ./packages/features/remote/infra
COPY packages/features/tickets/domain ./packages/features/tickets/domain
COPY packages/features/tickets/infra ./packages/features/tickets/infra
COPY packages/shared ./packages/shared

RUN npm run db:generate
RUN npm run build -w @dosc-syspro/app-api

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/packages/config ./packages/config
COPY --from=builder /app/packages/contracts ./packages/contracts
COPY --from=builder /app/packages/core ./packages/core
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/features/crm/domain ./packages/features/crm/domain
COPY --from=builder /app/packages/features/remote/domain ./packages/features/remote/domain
COPY --from=builder /app/packages/features/remote/infra ./packages/features/remote/infra
COPY --from=builder /app/packages/features/tickets/domain ./packages/features/tickets/domain
COPY --from=builder /app/packages/features/tickets/infra ./packages/features/tickets/infra
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./apps/api/node_modules/@prisma

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema ./packages/database/prisma/schema.prisma && node apps/api/dist/main.js"]
#CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema ./packages/database/prisma/schema.prisma && npm run db:seed:companies && if [ \"$SEED_REMOTE_HOSTS_ON_DEPLOY\" = \"true\" ]; then npm run db:seed:remote; fi && node apps/api/dist/main.js"]
