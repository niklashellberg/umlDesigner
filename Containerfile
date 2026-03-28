# =============================================================
# UML Designer container (minimal — pre-built locally)
#
# Pre-req:  make build-local
# Build:    container build -t uml-designer -f Containerfile .
# Run:      container run --name uml-designer -d -m 512 -p 3000:3000 -p 4444:4444 uml-designer
# =============================================================

FROM node:22-alpine

WORKDIR /app

# Next.js standalone includes its own node_modules
COPY --chown=node:node .next/standalone ./
COPY --chown=node:node .next/static ./.next/static

# ws-server is bundled with esbuild — zero external deps
COPY --chown=node:node server/dist/ws-server.js ./server/ws-server.js

RUN printf '#!/bin/sh\nnode /app/server/ws-server.js &\nexec node /app/server.js\n' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh && \
    mkdir -p /app/data/diagrams /app/data/context && \
    chown -R node:node /app/data

ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV WS_PORT=4444

EXPOSE 3000 4444

USER node

CMD ["/app/entrypoint.sh"]
