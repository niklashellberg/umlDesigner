export type DiagramType = 'class' | 'sequence' | 'flowchart' | 'activity' | 'state' | 'er'

export interface DiagramMeta {
  id: string
  title: string
  type: DiagramType
  createdAt: string
  updatedAt: string
}

export interface DiagramNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface DiagramEdge {
  id: string
  type: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  data: Record<string, unknown>
}

export interface Diagram {
  meta: DiagramMeta
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  code: string
  markdown: string
}

export interface ContextDocument {
  path: string
  addedAt: string
}
