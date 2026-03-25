# =============================================================
# UML Designer container
# Next.js app + y-websocket collaboration server
#
# Build:  container build -t uml-designer -f Containerfile .
# Run:    container run --name uml-designer -d -m 2048 -p 3000:3000 -p 4444:4444 uml-designer
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
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN pnpm build
# Compile WS server TS -> JS for production (avoids --experimental-strip-types)
RUN npx tsc server/ws-server.ts --outDir server/dist --esModuleInterop --module commonjs --target es2022 --skipLibCheck

# -- Production --
FROM node:22-bookworm-slim AS runner

RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /bin/bash appuser
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Entrypoint script: starts WS server + Next.js app
RUN printf '#!/bin/bash\nnode /app/server/dist/ws-server.js &\nexec node /app/server.js\n' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

RUN mkdir -p /app/data/diagrams /app/data/context && \
    chown -R appuser:appuser /app

USER appuser

ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV WS_PORT=4444

EXPOSE 3000 4444

ENTRYPOINT []
CMD ["/app/entrypoint.sh"]
