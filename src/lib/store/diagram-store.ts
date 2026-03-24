import { create } from 'zustand'
import type { Diagram, DiagramMeta, DiagramNode, DiagramEdge } from '@/lib/types/diagram'

interface DiagramState {
  meta: DiagramMeta | null
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  code: string
  isSaving: boolean
  lastSavedAt: string | null
  isInitialized: boolean
}

interface DiagramActions {
  initialize: (diagram: Diagram) => void
  setCode: (code: string) => void
  setTitle: (title: string) => void
  setNodes: (nodes: DiagramNode[]) => void
  setEdges: (edges: DiagramEdge[]) => void
  save: () => Promise<void>
  load: (id: string) => Promise<void>
}

type DiagramStore = DiagramState & DiagramActions

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  meta: null,
  nodes: [],
  edges: [],
  code: '',
  isSaving: false,
  lastSavedAt: null,
  isInitialized: false,

  initialize: (diagram: Diagram) => {
    set({
      meta: diagram.meta,
      nodes: diagram.nodes,
      edges: diagram.edges,
      code: diagram.code,
      isInitialized: true,
      lastSavedAt: diagram.meta.updatedAt,
    })
  },

  setCode: (code: string) => {
    set({ code })
  },

  setTitle: (title: string) => {
    const { meta } = get()
    if (!meta) return
    set({ meta: { ...meta, title } })
  },

  setNodes: (nodes: DiagramNode[]) => {
    set({ nodes })
  },

  setEdges: (edges: DiagramEdge[]) => {
    set({ edges })
  },

  save: async () => {
    const { meta, code, nodes, edges } = get()
    if (!meta) return

    set({ isSaving: true })
    try {
      const res = await fetch(`/api/mcp/diagrams/${meta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: meta.title, code, nodes, edges }),
      })

      if (res.ok) {
        set({ lastSavedAt: new Date().toISOString() })
      }
    } finally {
      set({ isSaving: false })
    }
  },

  load: async (id: string) => {
    const res = await fetch(`/api/mcp/diagrams/${id}`)
    if (!res.ok) return

    const diagram: Diagram = await res.json()
    get().initialize(diagram)
  },
}))
