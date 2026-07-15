FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN npm ci --include-workspace-root --no-audit --no-fund
RUN npm run build -w @dosc-syspro/web

FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat wget

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
