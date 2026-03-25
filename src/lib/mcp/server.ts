import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerDiagramTools } from './tools/diagram-tools'
import { registerContextTools } from './tools/context-tools'
import { registerDiagramResource } from './resources/diagram-resource'
import { registerUmlPrompts } from './prompts/uml-prompts'

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'uml-designer', version: '0.1.0' },
    {
      capabilities: { tools: {}, resources: {}, prompts: {} },
      instructions:
        'UML Designer MCP. Supported types: class, sequence, flowchart, activity. Code changes push live to browser via Yjs.',
    },
  )
  registerDiagramTools(server)
  registerContextTools(server)
  registerDiagramResource(server)
  registerUmlPrompts(server)
  return server
}
