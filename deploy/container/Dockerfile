FROM node:24.18.1-alpine AS builder

WORKDIR /workspace

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable
RUN apk add --no-cache python3 make g++

ARG PUBLIC_ADMIN_ORIGIN
ARG PLATFORM_RENDERER

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY site/package.json ./site/package.json

RUN pnpm install --frozen-lockfile --filter @webunit/site...
COPY scripts ./scripts
COPY site ./site
RUN test -n "$PLATFORM_RENDERER" || (echo "PLATFORM_RENDERER build-arg is required (theme or web)" >&2; exit 1)
RUN PUBLIC_ADMIN_ORIGIN=$PUBLIC_ADMIN_ORIGIN PLATFORM_RENDERER=$PLATFORM_RENDERER pnpm --filter @webunit/site build:container:runtime
RUN pnpm --filter @webunit/site deploy --prod --legacy /production

FROM node:24.18.1-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3003

COPY --from=builder --chown=node:node /workspace/site/dist ./dist
COPY --from=builder --chown=node:node /workspace/site/deploy/container/entry.mjs ./container-entry.mjs
COPY --from=builder --chown=node:node /production/node_modules ./node_modules

RUN mkdir -p /data && chown node:node /app /data

USER node

EXPOSE 3003

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- --header='Content-Type: application/json' --post-data='{}' http://127.0.0.1:3003/_/public/runtime/health/read | grep -q '"status":"ok"' || exit 1

CMD ["node", "container-entry.mjs"]
