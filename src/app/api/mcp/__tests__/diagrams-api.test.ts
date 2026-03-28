import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Diagram, DiagramMeta } from '@/lib/types/diagram'

// ---------------------------------------------------------------------------
// Mocks — must be before imports of the routes
// ---------------------------------------------------------------------------

vi.mock('@/lib/storage/diagrams', () => ({
  listDiagrams: vi.fn(),
  getDiagram: vi.fn(),
  saveDiagram: vi.fn(),
  deleteDiagram: vi.fn(),
  createEmptyDiagram: vi.fn(),
}))

import * as storage from '@/lib/storage/diagrams'
import {
  GET as listGET,
  POST,
} from '@/app/api/mcp/diagrams/route'
import {
  GET as singleGET,
  PUT,
  DELETE,
} from '@/app/api/mcp/diagrams/[id]/route'

const mockStorage = storage as {
  listDiagrams: ReturnType<typeof vi.fn>
  getDiagram: ReturnType<typeof vi.fn>
  saveDiagram: ReturnType<typeof vi.fn>
  deleteDiagram: ReturnType<typeof vi.fn>
  createEmptyDiagram: ReturnType<typeof vi.fn>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIAGRAM_ID = '00000000-0000-4000-8000-000000000001'

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

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/mcp/diagrams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeRouteParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// ---------------------------------------------------------------------------
// Group 1: POST /api/mcp/diagrams
// ---------------------------------------------------------------------------

describe('POST /api/mcp/diagrams', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create with default params returns 201 + ID', async () => {
    const diagram = makeDiagram()
    mockStorage.createEmptyDiagram.mockReturnValue(diagram)
    mockStorage.saveDiagram.mockResolvedValue(undefined)

    const req = makeRequest({})
    const res = await POST(req as never)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.id).toBe(DIAGRAM_ID)
    expect(mockStorage.createEmptyDiagram).toHaveBeenCalledWith(
      'Untitled Diagram',
      'class',
    )
  })

  it('create with custom title and type', async () => {
    const diagram = makeDiagram({
      meta: makeMeta({ title: 'My Flow', type: 'flowchart' }),
    })
    mockStorage.createEmptyDiagram.mockReturnValue(diagram)
    mockStorage.saveDiagram.mockResolvedValue(undefined)

    const req = makeRequest({ title: 'My Flow', type: 'flowchart' })
    const res = await POST(req as never)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.id).toBe(DIAGRAM_ID)
    expect(mockStorage.createEmptyDiagram).toHaveBeenCalledWith(
      'My Flow',
      'flowchart',
    )
  })

  it('create with invalid type passes value through (no server-side validation)', async () => {
    // The POST route currently does not validate the type enum;
    // it passes whatever it receives to createEmptyDiagram.
    // This test documents current behavior.
    const diagram = makeDiagram()
    mockStorage.createEmptyDiagram.mockReturnValue(diagram)
    mockStorage.saveDiagram.mockResolvedValue(undefined)

    const req = makeRequest({ type: 'invalid' })
    const res = await POST(req as never)

    // It still returns 201 because the route doesn't validate
    expect(res.status).toBe(201)
    expect(mockStorage.createEmptyDiagram).toHaveBeenCalledWith(
      'Untitled Diagram',
      'invalid',
    )
  })
})

// ---------------------------------------------------------------------------
// Group 2: GET /api/mcp/diagrams
// ---------------------------------------------------------------------------

describe('GET /api/mcp/diagrams', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns array of diagrams', async () => {
    const meta1 = makeMeta({ title: 'A' })
    const meta2 = makeMeta({
      id: '00000000-0000-4000-8000-000000000002',
      title: 'B',
    })
    mockStorage.listDiagrams.mockResolvedValue([meta1, meta2])

    const res = await listGET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toHaveLength(2)
  })

  it('each diagram has meta fields', async () => {
    mockStorage.listDiagrams.mockResolvedValue([makeMeta()])

    const res = await listGET()
    const json = await res.json()

    expect(json[0]).toHaveProperty('id')
    expect(json[0]).toHaveProperty('title')
    expect(json[0]).toHaveProperty('type')
    expect(json[0]).toHaveProperty('createdAt')
    expect(json[0]).toHaveProperty('updatedAt')
  })
})

// ---------------------------------------------------------------------------
// Group 3: GET /api/mcp/diagrams/[id]
// ---------------------------------------------------------------------------

describe('GET /api/mcp/diagrams/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns full diagram for valid ID', async () => {
    const diagram = makeDiagram()
    mockStorage.getDiagram.mockResolvedValue(diagram)

    const req = new Request('http://localhost:3000/api/mcp/diagrams/' + DIAGRAM_ID)
    const res = await singleGET(req as never, makeRouteParams(DIAGRAM_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.meta.id).toBe(DIAGRAM_ID)
    expect(json.code).toBe(diagram.code)
  })

  it('returns 404 for non-existent ID', async () => {
    mockStorage.getDiagram.mockResolvedValue(null)

    const missingId = '00000000-0000-4000-8000-000000000099'
    const req = new Request('http://localhost:3000/api/mcp/diagrams/' + missingId)
    const res = await singleGET(req as never, makeRouteParams(missingId))

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Not found')
  })

  it('returns 404 for invalid UUID format (storage returns null)', async () => {
    // getDiagram throws on invalid UUID internally, which returns null
    mockStorage.getDiagram.mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/mcp/diagrams/not-a-uuid')
    const res = await singleGET(req as never, makeRouteParams('not-a-uuid'))

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Group 4: PUT /api/mcp/diagrams/[id]
// ---------------------------------------------------------------------------

describe('PUT /api/mcp/diagrams/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('update title only', async () => {
    const diagram = makeDiagram()
    mockStorage.getDiagram.mockResolvedValue(diagram)
    mockStorage.saveDiagram.mockResolvedValue(undefined)

    const req = new Request('http://localhost:3000/api/mcp/diagrams/' + DIAGRAM_ID, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    })
    const res = await PUT(req as never, makeRouteParams(DIAGRAM_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.meta.title).toBe('Updated Title')
    expect(mockStorage.saveDiagram).toHaveBeenCalled()
  })

  it('update code only', async () => {
    const diagram = makeDiagram()
    mockStorage.getDiagram.mockResolvedValue(diagram)
    mockStorage.saveDiagram.mockResolvedValue(undefined)

    const req = new Request('http://localhost:3000/api/mcp/diagrams/' + DIAGRAM_ID, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'flowchart TD\n  A-->B\n' }),
    })
    const res = await PUT(req as never, makeRouteParams(DIAGRAM_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.code).toBe('flowchart TD\n  A-->B\n')
  })

  it('update nodes and edges', async () => {
    const diagram = makeDiagram()
    mockStorage.getDiagram.mockResolvedValue(diagram)
    mockStorage.saveDiagram.mockResolvedValue(undefined)

    const nodes = [
      { id: 'n1', type: 'default', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges = [
      { id: 'e1', type: 'default', source: 'n1', target: 'n2', data: {} },
    ]

    const req = new Request('http://localhost:3000/api/mcp/diagrams/' + DIAGRAM_ID, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges }),
    })
    const res = await PUT(req as never, makeRouteParams(DIAGRAM_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.nodes).toEqual(nodes)
    expect(json.edges).toEqual(edges)
  })

  it('partial update preserves other fields', async () => {
    const diagram = makeDiagram({
      code: 'original code',
      nodes: [{ id: 'n1', type: 'default', position: { x: 10, y: 20 }, data: {} }],
    })
    mockStorage.getDiagram.mockResolvedValue(diagram)
    mockStorage.saveDiagram.mockResolvedValue(undefined)

    // Only update title — code and nodes should remain
    const req = new Request('http://localhost:3000/api/mcp/diagrams/' + DIAGRAM_ID, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' }),
    })
    const res = await PUT(req as never, makeRouteParams(DIAGRAM_ID))
    const json = await res.json()

    expect(json.meta.title).toBe('New Title')
    expect(json.code).toBe('original code')
    expect(json.nodes).toHaveLength(1)
  })

  it('returns 404 for non-existent ID', async () => {
    mockStorage.getDiagram.mockResolvedValue(null)

    const missingId = '00000000-0000-4000-8000-000000000099'
    const req = new Request('http://localhost:3000/api/mcp/diagrams/' + missingId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nope' }),
    })
    const res = await PUT(req as never, makeRouteParams(missingId))

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Group 5: DELETE /api/mcp/diagrams/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/mcp/diagrams/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('delete returns 200 for existing', async () => {
    mockStorage.deleteDiagram.mockResolvedValue(true)

    const req = new Request('http://localhost:3000/api/mcp/diagrams/' + DIAGRAM_ID, {
      method: 'DELETE',
    })
    const res = await DELETE(req as never, makeRouteParams(DIAGRAM_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })

  it('delete returns 404 for non-existent', async () => {
    mockStorage.deleteDiagram.mockResolvedValue(false)

    const missingId = '00000000-0000-4000-8000-000000000099'
    const req = new Request('http://localhost:3000/api/mcp/diagrams/' + missingId, {
      method: 'DELETE',
    })
    const res = await DELETE(req as never, makeRouteParams(missingId))

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Not found')
  })
})
