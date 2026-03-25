/**
 * Integration tests — requires `pnpm dev:all` to be running.
 *
 * Run with: pnpm test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

const MCP_URL = process.env.MCP_URL ?? 'http://localhost:3000/api/mcp'

let client: Client

beforeAll(async () => {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL))
  client = new Client({ name: 'integration-test', version: '0.0.1' })
  await client.connect(transport)
})

afterAll(async () => {
  await client.close()
})

function getText(result: unknown): string {
  const r = result as CallToolResult
  return (r.content[0] as { type: 'text'; text: string }).text
}

describe('MCP server integration', () => {
  it('lists all 7 tools', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name)
    expect(names).toContain('list_diagrams')
    expect(names).toContain('create_diagram')
    expect(names).toContain('get_diagram')
    expect(names).toContain('update_diagram_code')
    expect(names).toContain('delete_diagram')
    expect(names).toContain('list_context_documents')
    expect(names).toContain('add_context_document')
    expect(tools).toHaveLength(7)
  })

  it('lists resource templates', async () => {
    const { resourceTemplates } = await client.listResourceTemplates()
    expect(resourceTemplates.some((r) => r.uriTemplate === 'diagram://{id}')).toBe(true)
  })

  it('lists prompts', async () => {
    const { prompts } = await client.listPrompts()
    const names = prompts.map((p) => p.name)
    expect(names).toContain('design_uml')
    expect(names).toContain('review_diagram')
  })

  it('create → get → delete round-trip', async () => {
    // Create
    const createResult = await client.callTool({
      name: 'create_diagram',
      arguments: { title: 'Integration Test Diagram', type: 'flowchart' },
    })
    expect((createResult as CallToolResult).isError).toBeFalsy()
    const created = JSON.parse(getText(createResult)) as { id: string; title: string; type: string }
    expect(created.type).toBe('flowchart')

    // Get
    const getResult = await client.callTool({
      name: 'get_diagram',
      arguments: { id: created.id },
    })
    expect((getResult as CallToolResult).isError).toBeFalsy()
    const fetched = JSON.parse(getText(getResult)) as { meta: { id: string } }
    expect(fetched.meta.id).toBe(created.id)

    // Delete
    const deleteResult = await client.callTool({
      name: 'delete_diagram',
      arguments: { id: created.id },
    })
    expect((deleteResult as CallToolResult).isError).toBeFalsy()
    const deleted = JSON.parse(getText(deleteResult)) as { deleted: boolean }
    expect(deleted.deleted).toBe(true)
  })
})
