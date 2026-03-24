/**
 * Context Documents API
 *
 * Allows MCP clients (Claude Code) to register file paths as context for a
 * diagram. Context entries are stored in data/context/contexts.json.
 *
 * GET  /api/mcp/context-documents           – list all entries
 * GET  /api/mcp/context-documents?diagramId=xxx – filter by diagram
 * POST /api/mcp/context-documents           – register a new entry
 *   Body: { diagramId: string, filePath: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const CONTEXT_DIR = path.join(process.cwd(), 'data', 'context')
const CONTEXT_FILE = path.join(CONTEXT_DIR, 'contexts.json')

interface ContextEntry {
  diagramId: string
  filePath: string
  addedAt: string
}

// ----------------------------------------------------------------------------
// Persistence helpers
// ----------------------------------------------------------------------------

async function readEntries(): Promise<ContextEntry[]> {
  try {
    const raw = await fs.readFile(CONTEXT_FILE, 'utf-8')
    return JSON.parse(raw) as ContextEntry[]
  } catch {
    return []
  }
}

async function writeEntries(entries: ContextEntry[]): Promise<void> {
  await fs.mkdir(CONTEXT_DIR, { recursive: true })
  await fs.writeFile(CONTEXT_FILE, JSON.stringify(entries, null, 2))
}

// ----------------------------------------------------------------------------
// Route handlers
// ----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const diagramId = searchParams.get('diagramId')

  const entries = await readEntries()
  const filtered = diagramId
    ? entries.filter((e) => e.diagramId === diagramId)
    : entries

  return NextResponse.json(filtered)
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>)['diagramId'] !== 'string' ||
    typeof (body as Record<string, unknown>)['filePath'] !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Body must contain diagramId (string) and filePath (string)' },
      { status: 400 },
    )
  }

  const { diagramId, filePath } = body as { diagramId: string; filePath: string }

  // Validate the file exists on disk
  try {
    await fs.access(filePath)
  } catch {
    return NextResponse.json(
      { error: `File not found on filesystem: ${filePath}` },
      { status: 422 },
    )
  }

  // Retrieve file metadata
  const stat = await fs.stat(filePath)

  const entries = await readEntries()

  // De-duplicate: update addedAt if the same (diagramId + filePath) already exists
  const existingIdx = entries.findIndex(
    (e) => e.diagramId === diagramId && e.filePath === filePath,
  )

  const entry: ContextEntry = {
    diagramId,
    filePath,
    addedAt: new Date().toISOString(),
  }

  if (existingIdx >= 0) {
    entries[existingIdx] = entry
  } else {
    entries.push(entry)
  }

  await writeEntries(entries)

  return NextResponse.json(
    {
      ...entry,
      size: stat.size,
      isDirectory: stat.isDirectory(),
    },
    { status: existingIdx >= 0 ? 200 : 201 },
  )
}
