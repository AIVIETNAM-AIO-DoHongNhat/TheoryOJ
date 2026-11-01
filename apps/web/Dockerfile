# Bản triển khai của apps/web (PLAN.md mục 3). Build từ gốc repo vì trang tĩnh đọc content/ lúc build:
#
#   docker build -f apps/web/Dockerfile -t theoryoj-web .
#
# Target `migrator` chạy drizzle-kit migrate và script báo cáo, dùng trong infra/docker-compose.prod.yml.

FROM node:22-slim AS deps
WORKDIR /repo/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS migrator
COPY apps/web/drizzle.config.ts apps/web/tsconfig.json ./
COPY apps/web/drizzle ./drizzle
COPY apps/web/src ./src
COPY apps/web/scripts ./scripts
CMD ["npx", "drizzle-kit", "migrate"]

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/web ./
COPY content /repo/content
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    CONTENT_DIR=/content
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "server.js"]
