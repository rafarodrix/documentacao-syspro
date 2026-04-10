FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/api/package.json ./packages/api/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/remote-domain/package.json ./packages/remote-domain/package.json

RUN npm pkg delete scripts.postinstall
RUN npm install -w @dosc-syspro/app-api --include-workspace-root --no-audit --no-fund

COPY apps/api ./apps/api
COPY packages/api ./packages/api
COPY packages/config ./packages/config
COPY packages/contracts ./packages/contracts
COPY packages/database ./packages/database
COPY packages/remote-domain ./packages/remote-domain

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
COPY --from=builder /app/packages/api ./packages/api
COPY --from=builder /app/packages/config ./packages/config
COPY --from=builder /app/packages/contracts ./packages/contracts
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/remote-domain ./packages/remote-domain
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./apps/api/node_modules/@prisma

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema ./packages/database/prisma/schema.prisma && node apps/api/dist/main.js"]
#CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema ./packages/database/prisma/schema.prisma && npm run db:seed:companies && if [ \"$SEED_REMOTE_HOSTS_ON_DEPLOY\" = \"true\" ]; then npm run db:seed:remote; fi && node apps/api/dist/main.js"]
