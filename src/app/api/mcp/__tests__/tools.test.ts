import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { createMcpServer } from '@/lib/mcp/server'
import type { Diagram, DiagramMeta } from '@/lib/types/diagram'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/storage/diagrams', () => ({
  listDiagrams: vi.fn(),
  getDiagram: vi.fn(),
  saveDiagram: vi.fn(),
  deleteDiagram: vi.fn(),
  createEmptyDiagram: vi.fn(),
}))

vi.mock('@/lib/mcp/yjs-bridge', () => ({
  pushCodeToYjs: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import * as storage from '@/lib/storage/diagrams'
import * as yjsBridge from '@/lib/mcp/yjs-bridge'

const mockStorage = storage as {
  listDiagrams: ReturnType<typeof vi.fn>
  getDiagram: ReturnType<typeof vi.fn>
  saveDiagram: ReturnType<typeof vi.fn>
  deleteDiagram: ReturnType<typeof vi.fn>
  createEmptyDiagram: ReturnType<typeof vi.fn>
}
const mockYjs = yjsBridge as { pushCodeToYjs: ReturnType<typeof vi.fn> }

// Valid UUIDs: zod v4 requires version [1-8] and variant [89abAB]
const DIAGRAM_ID = '00000000-0000-4000-8000-000000000001'
const MISSING_ID = '00000000-0000-4000-8000-000000000099'

function getText(result: unknown): string {
  const r = result as CallToolResult
  return (r.content[0] as { type: 'text'; text: string }).text
}

function isError(result: unknown): boolean {
  return !!(result as CallToolResult).isError
}

function makeMeta(overrides: Partial<DiagramMeta> = {}): DiagramMeta {
  return {
    id: DIAGRAM_ID,
    title: 'Test Diagram',
    type: 'class',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeDiagram(overrides: Partial<Diagram> = {}): Diagram {
  return {
    meta: makeMeta(),
    nodes: [],
    edges: [],
    code: 'classDiagram\n  class Foo {}\n',
    markdown: '',
    ...overrides,
  }
}

async function createClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createMcpServer()
  await server.connect(serverTransport)
  const client = new Client({ name: 'test-client', version: '0.0.1' })
  await client.connect(clientTransport)
  return client
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('list_diagrams', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns sorted metadata', async () => {
    const meta1 = makeMeta({ id: DIAGRAM_ID, title: 'A' })
    const meta2 = makeMeta({ id: '00000000-0000-4000-8000-000000000002', title: 'B' })
    mockStorage.listDiagrams.mockResolvedValue([meta1, meta2])

    const client = await createClient()
    const result = await client.callTool({ name: 'list_diagrams', arguments: {} })

    expect(isError(result)).toBeFalsy()
    const parsed = JSON.parse(getText(result))
    expect(parsed).toHaveLength(2)
    expect(parsed[0].title).toBe('A')
  })
})

describe('create_diagram', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates and saves a diagram', async () => {
    const diagram = makeDiagram()
    mockStorage.createEmptyDiagram.mockReturnValue(diagram)
    mockStorage.saveDiagram.mockResolvedValue(undefined)

    const client = await createClient()
    const result = await client.callTool({
      name: 'create_diagram',
      arguments: { title: 'Test Diagram', type: 'class' },
    })

    expect(isError(result)).toBeFalsy()
    expect(mockStorage.saveDiagram).toHaveBeenCalledWith(diagram)
    const parsed = JSON.parse(getText(result))
    expect(parsed.id).toBe(diagram.meta.id)
    expect(parsed.type).toBe('class')
  })

  it('returns isError for invalid diagram type', async () => {
    const client = await createClient()
    const result = await client.callTool({
      name: 'create_diagram',
      arguments: { title: 'X', type: 'invalid' },
    })
    expect(isError(result)).toBe(true)
  })
})

describe('get_diagram', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns diagram JSON when found', async () => {
    const diagram = makeDiagram()
    mockStorage.getDiagram.mockResolvedValue(diagram)

    const client = await createClient()
    const result = await client.callTool({
      name: 'get_diagram',
      arguments: { id: diagram.meta.id },
    })

    expect(isError(result)).toBeFalsy()
    const parsed = JSON.parse(getText(result))
    expect(parsed.meta.id).toBe(diagram.meta.id)
  })

  it('returns error when not found', async () => {
    mockStorage.getDiagram.mockResolvedValue(null)

    const client = await createClient()
    const result = await client.callTool({
      name: 'get_diagram',
      arguments: { id: MISSING_ID },
    })

    expect(isError(result)).toBe(true)
  })
})

describe('update_diagram_code', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves code and pushes to Yjs', async () => {
    const diagram = makeDiagram()
    mockStorage.getDiagram.mockResolvedValue(diagram)
    mockStorage.saveDiagram.mockResolvedValue(undefined)
    mockYjs.pushCodeToYjs.mockResolvedValue({ ok: true })

    const client = await createClient()
    const result = await client.callTool({
      name: 'update_diagram_code',
      arguments: { id: diagram.meta.id, mermaidCode: 'classDiagram\n  class Bar {}\n' },
    })

    expect(isError(result)).toBeFalsy()
    expect(mockStorage.saveDiagram).toHaveBeenCalled()
    expect(mockYjs.pushCodeToYjs).toHaveBeenCalledWith(
      diagram.meta.id,
      'classDiagram\n  class Bar {}\n',
    )
    const parsed = JSON.parse(getText(result))
    expect(parsed.yjs).toBe('synced')
  })

  it('reports yjs unavailable when WS is down', async () => {
    const diagram = makeDiagram()
    mockStorage.getDiagram.mockResolvedValue(diagram)
    mockStorage.saveDiagram.mockResolvedValue(undefined)
    mockYjs.pushCodeToYjs.mockResolvedValue({ ok: false, error: 'connection refused' })

    const client = await createClient()
    const result = await client.callTool({
      name: 'update_diagram_code',
      arguments: { id: diagram.meta.id, mermaidCode: 'classDiagram\n  class Bar {}\n' },
    })

    expect(isError(result)).toBeFalsy()
    const parsed = JSON.parse(getText(result))
    expect(parsed.yjs).toBe('unavailable')
  })

  it('returns error when diagram not found', async () => {
    mockStorage.getDiagram.mockResolvedValue(null)

    const client = await createClient()
    const result = await client.callTool({
      name: 'update_diagram_code',
      arguments: { id: MISSING_ID, mermaidCode: 'classDiagram\n' },
    })

    expect(isError(result)).toBe(true)
  })
})

describe('delete_diagram', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes existing diagram', async () => {
    mockStorage.deleteDiagram.mockResolvedValue(true)

    const client = await createClient()
    const result = await client.callTool({
      name: 'delete_diagram',
      arguments: { id: DIAGRAM_ID },
    })

    expect(isError(result)).toBeFalsy()
    const parsed = JSON.parse(getText(result))
    expect(parsed.deleted).toBe(true)
  })

  it('returns error when diagram not found', async () => {
    mockStorage.deleteDiagram.mockResolvedValue(false)

    const client = await createClient()
    const result = await client.callTool({
      name: 'delete_diagram',
      arguments: { id: MISSING_ID },
    })

    expect(isError(result)).toBe(true)
  })
})
