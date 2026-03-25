import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getDiagram, listDiagrams } from '@/lib/storage/diagrams'

export function registerDiagramResource(server: McpServer): void {
  const template = new ResourceTemplate('diagram://{id}', { list: undefined })

  server.registerResource(
    'diagram',
    template,
    {
      description: 'Full diagram JSON accessed by diagram UUID. URI format: diagram://{id}',
      mimeType: 'application/json',
    },
    async (uri, { id }) => {
      const diagramId = Array.isArray(id) ? id[0] : id
      const diagram = await getDiagram(diagramId)
      if (!diagram) {
        throw new Error(`Diagram not found: ${diagramId}`)
      }
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(diagram, null, 2),
          },
        ],
      }
    },
  )
}
