import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  listDiagrams,
  getDiagram,
  saveDiagram,
  deleteDiagram,
  createEmptyDiagram,
} from '@/lib/storage/diagrams'
import { pushCodeToYjs } from '@/lib/mcp/yjs-bridge'

const diagramTypeSchema = z.enum(['class', 'sequence', 'flowchart', 'activity'])

export function registerDiagramTools(server: McpServer): void {
  server.registerTool(
    'list_diagrams',
    {
      description: 'List all saved diagrams, sorted by most recently updated.',
    },
    async () => {
      const diagrams = await listDiagrams()
      return {
        content: [{ type: 'text', text: JSON.stringify(diagrams, null, 2) }],
      }
    },
  )

  server.registerTool(
    'create_diagram',
    {
      description: 'Create a new diagram with a default Mermaid template.',
      inputSchema: {
        title: z.string().min(1).describe('Human-readable name for the diagram'),
        type: diagramTypeSchema.describe('Diagram type: class, sequence, flowchart, or activity'),
      },
    },
    async ({ title, type }) => {
      const diagram = createEmptyDiagram(title, type)
      await saveDiagram(diagram)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { id: diagram.meta.id, title: diagram.meta.title, type: diagram.meta.type },
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  server.registerTool(
    'get_diagram',
    {
      description: 'Get the full diagram JSON including metadata, nodes, edges, and Mermaid code.',
      inputSchema: {
        id: z.string().uuid().describe('Diagram UUID'),
      },
    },
    async ({ id }) => {
      const diagram = await getDiagram(id)
      if (!diagram) {
        return {
          content: [{ type: 'text', text: `Diagram not found: ${id}` }],
          isError: true,
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(diagram, null, 2) }],
      }
    },
  )

  server.registerTool(
    'update_diagram_code',
    {
      description:
        'Update a diagram\'s Mermaid code (and optionally its title). Saves to disk and pushes the change live to the browser via Yjs.',
      inputSchema: {
        id: z.string().uuid().describe('Diagram UUID'),
        mermaidCode: z.string().min(1).describe('Full Mermaid source code'),
        title: z.string().min(1).optional().describe('New title (optional)'),
      },
    },
    async ({ id, mermaidCode, title }) => {
      const diagram = await getDiagram(id)
      if (!diagram) {
        return {
          content: [{ type: 'text', text: `Diagram not found: ${id}` }],
          isError: true,
        }
      }

      diagram.code = mermaidCode
      if (title) diagram.meta.title = title

      await saveDiagram(diagram)

      const yjsResult = await pushCodeToYjs(id, mermaidCode)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                id: diagram.meta.id,
                title: diagram.meta.title,
                updatedAt: diagram.meta.updatedAt,
                yjs: yjsResult.ok ? 'synced' : 'unavailable',
              },
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  server.registerTool(
    'delete_diagram',
    {
      description: 'Permanently delete a diagram by ID.',
      inputSchema: {
        id: z.string().uuid().describe('Diagram UUID'),
      },
    },
    async ({ id }) => {
      const deleted = await deleteDiagram(id)
      if (!deleted) {
        return {
          content: [{ type: 'text', text: `Diagram not found: ${id}` }],
          isError: true,
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ deleted: true, id }, null, 2) }],
      }
    },
  )
}
