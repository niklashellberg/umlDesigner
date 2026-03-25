#!/bin/bash
# Sync changes from "umlDesigner 2" into this project.
# Only copies source code, config, and new files — skips data, node_modules, .git, lockfile.

set -euo pipefail

SRC="/Users/niklashellberg/Projects/apps/umlDesigner 2"
DST="/Users/niklashellberg/Projects/apps/umlDesigner"

if [ ! -d "$SRC" ]; then
  echo "Error: Source directory not found: $SRC"
  exit 1
fi

echo "=== Syncing from umlDesigner 2 ==="

# --- New files (only in v2) ---
echo ""
echo "--- Copying new files ---"

# MCP server implementation
mkdir -p "$DST/src/lib/mcp/prompts" "$DST/src/lib/mcp/resources" "$DST/src/lib/mcp/tools"
cp -v "$SRC/src/lib/mcp/server.ts" "$DST/src/lib/mcp/server.ts"
cp -rv "$SRC/src/lib/mcp/prompts/"* "$DST/src/lib/mcp/prompts/" 2>/dev/null || true
cp -rv "$SRC/src/lib/mcp/resources/"* "$DST/src/lib/mcp/resources/" 2>/dev/null || true
cp -rv "$SRC/src/lib/mcp/tools/"* "$DST/src/lib/mcp/tools/" 2>/dev/null || true

# MCP discovery route
cp -v "$SRC/src/app/api/mcp/route.ts" "$DST/src/app/api/mcp/route.ts"

# API tests
mkdir -p "$DST/src/app/api/mcp/__tests__"
cp -rv "$SRC/src/app/api/mcp/__tests__/"* "$DST/src/app/api/mcp/__tests__/" 2>/dev/null || true

# Vitest config
cp -v "$SRC/vitest.config.ts" "$DST/vitest.config.ts"

# --- Changed files ---
echo ""
echo "--- Updating changed files ---"

cp -v "$SRC/src/app/api/mcp/diagrams/[id]/route.ts" "$DST/src/app/api/mcp/diagrams/[id]/route.ts"
cp -v "$SRC/src/components/code-editor/CodeEditor.tsx" "$DST/src/components/code-editor/CodeEditor.tsx"
cp -v "$SRC/src/components/editor/DiagramEditor.tsx" "$DST/src/components/editor/DiagramEditor.tsx"
cp -v "$SRC/src/lib/mcp/yjs-bridge.ts" "$DST/src/lib/mcp/yjs-bridge.ts"
cp -v "$SRC/package.json" "$DST/package.json"
cp -v "$SRC/Containerfile" "$DST/Containerfile"
cp -v "$SRC/Makefile" "$DST/Makefile"
cp -v "$SRC/.gitignore" "$DST/.gitignore"

echo ""
echo "=== Sync complete ==="
echo ""
echo "Next steps:"
echo "  1. cd $DST"
echo "  2. pnpm install          # install new deps (vitest etc.)"
echo "  3. pnpm type-check       # verify types"
echo "  4. pnpm test:run         # run tests"
echo "  5. pnpm build            # verify build"
echo "  6. git diff              # review changes"
