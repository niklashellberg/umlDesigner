import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Diagram, DiagramMeta, DiagramType } from '@/lib/types/diagram'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data', 'diagrams')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function diagramPath(id: string) {
  return path.join(DATA_DIR, `${id}.json`)
}

export async function listDiagrams(): Promise<DiagramMeta[]> {
  await ensureDir()
  const files = await fs.readdir(DATA_DIR)
  const diagrams: DiagramMeta[] = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8')
    const diagram: Diagram = JSON.parse(content)
    diagrams.push(diagram.meta)
  }

  return diagrams.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export async function getDiagram(id: string): Promise<Diagram | null> {
  try {
    const content = await fs.readFile(diagramPath(id), 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function saveDiagram(diagram: Diagram): Promise<void> {
  await ensureDir()
  diagram.meta.updatedAt = new Date().toISOString()
  await fs.writeFile(diagramPath(diagram.meta.id), JSON.stringify(diagram, null, 2))
}

export async function deleteDiagram(id: string): Promise<boolean> {
  try {
    await fs.unlink(diagramPath(id))
    return true
  } catch {
    return false
  }
}

export function createEmptyDiagram(title: string, type: DiagramType): Diagram {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const defaultCode: Record<DiagramType, string> = {
    class: `classDiagram\n    class ${title.replace(/\s+/g, '')} {\n    }\n`,
    sequence: `sequenceDiagram\n    participant A\n    participant B\n    A->>B: Message\n`,
    flowchart: `flowchart TD\n    A[Start] --> B[Process]\n    B --> C[End]\n`,
    activity: `flowchart TD\n  subgraph Lane1["Actor 1"]\n    Start1((start)) --> A1(Activity 1)\n    A1 --> A2(Activity 2)\n  end\n  subgraph Lane2["Actor 2"]\n    A2 --> B1(Activity 3)\n    B1 --> End1((end))\n  end\n`,
  }

  return {
    meta: { id, title, type, createdAt: now, updatedAt: now },
    nodes: [],
    edges: [],
    code: defaultCode[type],
  }
}
