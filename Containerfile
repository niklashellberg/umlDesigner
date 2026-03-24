# =============================================================
# UML Designer container
# Next.js app + y-websocket collaboration server
#
# Build:  container build -t uml-designer -f Containerfile .
# Run:    container run --name uml-designer -d -p 3000:3000 -p 4444:4444 uml-designer
# Start:  container start uml-designer
# Stop:   container stop uml-designer
# =============================================================

FROM node:22-bookworm AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# -- Dependencies --
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -- Build --
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# -- Production --
FROM node:22-bookworm-slim AS runner
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/data/diagrams /app/data/context && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 3000 4444

CMD ["node", "server.js"]
