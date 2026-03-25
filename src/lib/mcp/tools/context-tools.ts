import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const CONTEXT_DIR = path.join(process.cwd(), 'data', 'context')
const CONTEXT_FILE = path.join(CONTEXT_DIR, 'contexts.json')

interface ContextEntry {
  diagramId: string
  filePath: string
  addedAt: string
}

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

export function registerContextTools(server: McpServer): void {
  server.registerTool(
    'list_context_documents',
    {
      description: 'List context documents registered for a diagram (or all diagrams).',
      inputSchema: {
        diagramId: z.string().uuid().optional().describe('Filter by diagram UUID (optional)'),
      },
    },
    async ({ diagramId }) => {
      const entries = await readEntries()
      const filtered = diagramId ? entries.filter((e) => e.diagramId === diagramId) : entries
      return {
        content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
      }
    },
  )

  server.registerTool(
    'add_context_document',
    {
      description:
        'Register an absolute file path as context for a diagram. The file must exist on disk.',
      inputSchema: {
        diagramId: z.string().uuid().describe('Diagram UUID'),
        filePath: z.string().min(1).describe('Absolute path to the file (must exist)'),
      },
    },
    async ({ diagramId, filePath }) => {
      try {
        await fs.access(filePath)
      } catch {
        return {
          content: [{ type: 'text', text: `File not found on filesystem: ${filePath}` }],
          isError: true,
        }
      }

      const entries = await readEntries()
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

      return {
        content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }],
      }
    },
  )
}
