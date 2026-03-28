import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Set DATA_DIR before importing the storage module so the module-level
// constant picks up our temp directory instead of the real data folder.
const TEST_DIR = path.join(os.tmpdir(), `uml-storage-test-${Date.now()}`)
process.env.DATA_DIR = TEST_DIR

// Dynamic import after env is set
const {
  createEmptyDiagram,
  saveDiagram,
  getDiagram,
  listDiagrams,
  deleteDiagram,
} = await import('@/lib/storage/diagrams')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function cleanDir() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

beforeEach(async () => {
  await cleanDir()
  await fs.mkdir(TEST_DIR, { recursive: true })
})

afterAll(async () => {
  await cleanDir()
  delete process.env.DATA_DIR
})

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// ---------------------------------------------------------------------------
// Group 1: createEmptyDiagram
// ---------------------------------------------------------------------------

describe('createEmptyDiagram', () => {
  it('creates a valid diagram with correct structure', () => {
    const d = createEmptyDiagram('My Diagram', 'class')
    expect(d).toHaveProperty('meta')
    expect(d).toHaveProperty('nodes')
    expect(d).toHaveProperty('edges')
    expect(d).toHaveProperty('code')
    expect(Array.isArray(d.nodes)).toBe(true)
    expect(Array.isArray(d.edges)).toBe(true)
  })

  it('class type gets classDiagram default code', () => {
    const d = createEmptyDiagram('Foo', 'class')
    expect(d.code).toContain('classDiagram')
  })

  it('flowchart type gets flowchart TD default code', () => {
    const d = createEmptyDiagram('Foo', 'flowchart')
    expect(d.code).toContain('flowchart TD')
  })

  it('activity type gets default activity code', () => {
    const d = createEmptyDiagram('Foo', 'activity')
    expect(d.code).toContain('flowchart TD')
    expect(d.code).toContain('subgraph')
  })

  it('sequence type gets sequenceDiagram default code', () => {
    const d = createEmptyDiagram('Foo', 'sequence')
    expect(d.code).toContain('sequenceDiagram')
  })

  it('default title "Untitled Diagram" is used when provided', () => {
    const d = createEmptyDiagram('Untitled Diagram', 'class')
    expect(d.meta.title).toBe('Untitled Diagram')
  })

  it('custom title is used when provided', () => {
    const d = createEmptyDiagram('My Custom Title', 'flowchart')
    expect(d.meta.title).toBe('My Custom Title')
  })

  it('ID is a valid UUID', () => {
    const d = createEmptyDiagram('Test', 'class')
    expect(d.meta.id).toMatch(UUID_RE)
  })

  it('timestamps are set', () => {
    const before = new Date().toISOString()
    const d = createEmptyDiagram('Test', 'class')
    const after = new Date().toISOString()
    expect(d.meta.createdAt >= before).toBe(true)
    expect(d.meta.createdAt <= after).toBe(true)
    expect(d.meta.updatedAt).toBe(d.meta.createdAt)
  })
})

// ---------------------------------------------------------------------------
// Group 2: saveDiagram and getDiagram
// ---------------------------------------------------------------------------

describe('saveDiagram and getDiagram', () => {
  it('save then get returns the same diagram', async () => {
    const d = createEmptyDiagram('Round-trip', 'class')
    await saveDiagram(d)
    const loaded = await getDiagram(d.meta.id)

    expect(loaded).not.toBeNull()
    expect(loaded!.meta.id).toBe(d.meta.id)
    expect(loaded!.meta.title).toBe('Round-trip')
    expect(loaded!.code).toBe(d.code)
    expect(loaded!.nodes).toEqual(d.nodes)
    expect(loaded!.edges).toEqual(d.edges)
  })

  it('save updates the updatedAt timestamp', async () => {
    const d = createEmptyDiagram('Timestamps', 'flowchart')
    const originalUpdatedAt = d.meta.updatedAt
    // Small delay to ensure timestamp differs
    await new Promise((r) => setTimeout(r, 10))
    await saveDiagram(d)

    const loaded = await getDiagram(d.meta.id)
    expect(loaded!.meta.updatedAt >= originalUpdatedAt).toBe(true)
  })

  it('get with non-existent ID returns null', async () => {
    const result = await getDiagram('00000000-0000-4000-8000-000000000099')
    expect(result).toBeNull()
  })

  it('get with invalid UUID throws/returns null (path traversal protection)', async () => {
    const result = await getDiagram('../../../etc/passwd')
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Group 3: listDiagrams
// ---------------------------------------------------------------------------

describe('listDiagrams', () => {
  it('returns empty array when no diagrams', async () => {
    const list = await listDiagrams()
    expect(list).toEqual([])
  })

  it('returns all diagrams sorted by updatedAt descending', async () => {
    const d1 = createEmptyDiagram('First', 'class')
    await saveDiagram(d1)
    // Small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 15))
    const d2 = createEmptyDiagram('Second', 'flowchart')
    await saveDiagram(d2)

    const list = await listDiagrams()
    expect(list).toHaveLength(2)
    // Most recently updated first
    expect(list[0].title).toBe('Second')
    expect(list[1].title).toBe('First')
  })

  it('each item has correct meta fields', async () => {
    const d = createEmptyDiagram('Meta Test', 'sequence')
    await saveDiagram(d)

    const list = await listDiagrams()
    expect(list).toHaveLength(1)
    const meta = list[0]
    expect(meta).toHaveProperty('id')
    expect(meta).toHaveProperty('title', 'Meta Test')
    expect(meta).toHaveProperty('type', 'sequence')
    expect(meta).toHaveProperty('createdAt')
    expect(meta).toHaveProperty('updatedAt')
  })
})

// ---------------------------------------------------------------------------
// Group 4: deleteDiagram
// ---------------------------------------------------------------------------

describe('deleteDiagram', () => {
  it('delete existing diagram returns true', async () => {
    const d = createEmptyDiagram('To Delete', 'class')
    await saveDiagram(d)

    const result = await deleteDiagram(d.meta.id)
    expect(result).toBe(true)
  })

  it('delete non-existent diagram returns false', async () => {
    const result = await deleteDiagram('00000000-0000-4000-8000-000000000099')
    expect(result).toBe(false)
  })

  it('after delete, getDiagram returns null', async () => {
    const d = createEmptyDiagram('Delete Me', 'flowchart')
    await saveDiagram(d)
    await deleteDiagram(d.meta.id)

    const loaded = await getDiagram(d.meta.id)
    expect(loaded).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Group 5: UUID validation (security)
// ---------------------------------------------------------------------------

describe('UUID validation', () => {
  it('valid UUID passes validation', async () => {
    const d = createEmptyDiagram('Valid', 'class')
    await saveDiagram(d)
    const loaded = await getDiagram(d.meta.id)
    expect(loaded).not.toBeNull()
  })

  it('path traversal attempt (../../../etc/passwd) is rejected', async () => {
    const result = await getDiagram('../../../etc/passwd')
    expect(result).toBeNull()
  })

  it('empty string is rejected', async () => {
    const result = await getDiagram('')
    expect(result).toBeNull()
  })

  it('non-UUID string is rejected', async () => {
    const result = await getDiagram('not-a-uuid')
    expect(result).toBeNull()
  })
})
