# UML Designer

Interactive, AI-powered UML and flowchart design tool with real-time collaboration.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript strict
- **Canvas**: @xyflow/react (React Flow v12)
- **Code Editor**: Monaco Editor + Mermaid.js
- **Collaboration**: Yjs + y-websocket (CRDT)
- **State**: Zustand
- **Styling**: Tailwind CSS v4
- **Container**: Apple Containers (Containerfile + `container` CLI)
- **AI Integration**: Claude Code via MCP HTTP endpoints

## Commands

```bash
pnpm dev              # Start Next.js dev server
pnpm dev:ws           # Start y-websocket server
pnpm dev:all          # Start both (concurrently)
pnpm build            # Production build
pnpm type-check       # TypeScript check
pnpm lint             # ESLint
pnpm test             # Vitest (watch)
pnpm test:run         # Vitest (single run)
make build            # Build Apple Container image
make up               # Build + run container
make down             # Stop + remove container
make logs             # View container logs
```

## Architecture

### Dual-Mode Editor
- Visual canvas (React Flow) and code editor (Monaco/Mermaid) share the same Yjs document
- Active mode drives sync: visual changes -> regenerate Mermaid, code changes -> update nodes/edges

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components (canvas/, code-editor/, editor/)
- `src/lib/` - Core logic (yjs/, sync/, export/, storage/, types/)
- `server/` - Standalone y-websocket server
- `data/diagrams/` - Persisted diagram JSON files
- `data/context/` - Mounted files for AI context

### MCP API
REST endpoints at `/api/mcp/*` for Claude Code integration.
Container accessible on LAN via `http://192.168.x.x:3000`.

## Conventions

- LF line endings only
- Single quotes, no semicolons, trailing commas
- Conventional Commits in English
