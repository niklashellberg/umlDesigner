# UML Designer

An interactive UML diagram editor with real-time collaboration, AI assistance via MCP, and a visual canvas built on React Flow.

## Quick Start

```bash
pnpm install
pnpm dev:all
```

Opens at http://localhost:3000. The collaborative WebSocket server starts on ws://localhost:4444.

## Container Setup (Apple Container)

```bash
make build && make up
```

Runs the Next.js app and WebSocket server together in a single container, exposing ports 3000 and 4444.

Other container commands:

```bash
make down     # Stop and remove the container
make logs     # Tail container logs
make clean    # Remove container and image
```

## MCP Integration

The app exposes an MCP-compatible REST API for AI agents:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mcp/diagrams` | List all diagrams |
| POST | `/api/mcp/diagrams` | Create a diagram (`{ title, type }`) |
| GET | `/api/mcp/diagrams/:id` | Get a diagram |
| PUT | `/api/mcp/diagrams/:id` | Update code, nodes, edges, or title |
| DELETE | `/api/mcp/diagrams/:id` | Delete a diagram |
| GET/POST | `/api/mcp/context-documents` | Manage context documents for AI |
| GET | `/api/mcp/health` | Health check |

When the `mermaidCode` field is updated via PUT, changes are pushed live into the
open browser session through the Yjs WebSocket server.

## Architecture

```
src/
  app/                  Next.js App Router pages and API routes
  components/
    canvas/             React Flow visual editor (nodes, edges, panels)
    code-editor/        Monaco editor with Yjs CRDT binding
    editor/             DiagramEditor shell, export, collaboration status
    diagrams/           Landing page cards and empty state
  hooks/                Shared React hooks (keyboard shortcuts)
  lib/
    store/              Zustand diagram state
    sync/               Bidirectional code <-> nodes/edges sync engine
    types/              TypeScript types
    yjs/                Yjs document structure, provider, awareness
    mcp/                Yjs bridge for MCP live-push
    storage/            File-based diagram persistence
server/
  ws-server.ts          y-websocket WebSocket server for real-time collaboration
```

Diagrams are persisted as JSON files in `data/diagrams/`. The Yjs document
layer provides conflict-free real-time collaboration between browser tabs and
AI agents editing via MCP simultaneously.
