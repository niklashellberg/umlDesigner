'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import type { Diagram, DiagramNode, DiagramEdge } from '@/lib/types/diagram'
import { useDiagramStore } from '@/lib/store/diagram-store'
import { CodeEditor } from '@/components/code-editor/CodeEditor'
import { MermaidPreview } from '@/components/code-editor/MermaidPreview'
import { ExportMenu } from '@/components/editor/ExportMenu'
import { Canvas } from '@/components/canvas/Canvas'
import { CollaborationStatus } from '@/components/editor/CollaborationStatus'
import { syncToCode, syncFromCode } from '@/lib/sync/sync-engine'
import { createYjsProvider } from '@/lib/yjs/provider'
import { initLocalAwareness } from '@/lib/yjs/awareness'
import {
  seedDocFromDiagram,
  getSharedCode,
  getSharedNodes,
  getSharedEdges,
} from '@/lib/yjs/document'
import { syncNodesToYjs, syncEdgesToYjs } from '@/lib/yjs/react-flow-binding'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

type EditorMode = 'code' | 'split' | 'visual'

interface Props {
  diagram: Diagram
}

export function DiagramEditor({ diagram }: Props) {
  const [mode, setMode] = useState<EditorMode>('split')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Yjs state
  const [yjsProvider, setYjsProvider] = useState<WebsocketProvider | null>(null)
  const [yText, setYText] = useState<Y.Text | null>(null)
  const [undoManager, setUndoManager] = useState<Y.UndoManager | null>(null)
  const yjsDestroyRef = useRef<(() => void) | null>(null)

  const initialize = useDiagramStore((s) => s.initialize)
  const title = useDiagramStore((s) => s.meta?.title ?? '')
  const diagramType = useDiagramStore((s) => s.meta?.type ?? 'class')
  const setTitle = useDiagramStore((s) => s.setTitle)
  const code = useDiagramStore((s) => s.code)
  const setCode = useDiagramStore((s) => s.setCode)
  const storeNodes = useDiagramStore((s) => s.nodes)
  const storeEdges = useDiagramStore((s) => s.edges)
  const setStoreNodes = useDiagramStore((s) => s.setNodes)
  const setStoreEdges = useDiagramStore((s) => s.setEdges)
  const save = useDiagramStore((s) => s.save)
  const isSaving = useDiagramStore((s) => s.isSaving)
  const lastSavedAt = useDiagramStore((s) => s.lastSavedAt)
  const isInitialized = useDiagramStore((s) => s.isInitialized)

  // Track previous mode for sync on mode change
  const prevModeRef = useRef<EditorMode>(mode)

  // -------------------------------------------------------------------------
  // Initialise local store
  // -------------------------------------------------------------------------
  useEffect(() => {
    initialize(diagram)
  }, [diagram, initialize])

  // -------------------------------------------------------------------------
  // Initialise Yjs provider (client-side only)
  // -------------------------------------------------------------------------
  useEffect(() => {
    let destroyed = false
    let yTextExposed = false

    const { doc, provider, destroy } = createYjsProvider(diagram.meta.id)
    yjsDestroyRef.current = destroy

    // Set up local awareness (username / colour)
    initLocalAwareness(provider)

    const sharedCode = getSharedCode(doc)
    const yNodes = getSharedNodes(doc)
    const yEdges = getSharedEdges(doc)
    const manager = new Y.UndoManager([sharedCode, yNodes, yEdges], {
      captureTimeout: 500,
    })

    if (!destroyed) {
      setYjsProvider(provider)
      setUndoManager(manager)
    }

    // When the Yjs doc syncs, propagate changes to Zustand store
    const nodesObserver = () => {
      const nodes: DiagramNode[] = []
      yNodes.forEach((n) => nodes.push(n))
      setStoreNodes(nodes)
    }
    const edgesObserver = () => {
      const edges: DiagramEdge[] = []
      yEdges.forEach((e) => edges.push(e))
      setStoreEdges(edges)
    }
    const codeObserver = () => {
      setCode(sharedCode.toString())
    }

    yNodes.observe(nodesObserver)
    yEdges.observe(edgesObserver)
    sharedCode.observe(codeObserver)

    // Seed the doc AFTER WS sync to prevent CRDT duplication.
    //
    // If we seed before sync the fresh local doc gets an insert(clientId=NEW, "code…").
    // The server already has insert(clientId=OLD, "code…") from the previous session.
    // Yjs keeps both (different client IDs) → content doubles on every page reload.
    //
    // After sync we know the server's state and can insert only when truly needed.
    function seedAndExposeYText() {
      if (yTextExposed || destroyed) return
      yTextExposed = true

      // Reset code to the canonical saved state when the server's copy differs
      // (handles both brand-new diagrams and content corrupted by the pre-fix bug).
      const serverCode = sharedCode.toString()
      if (serverCode !== diagram.code) {
        doc.transact(() => {
          if (sharedCode.length > 0) sharedCode.delete(0, sharedCode.length)
          if (diagram.code.length > 0) sharedCode.insert(0, diagram.code)
        })
      }

      // Seed meta/nodes/edges only when not yet initialised (guards are inside)
      seedDocFromDiagram(doc, diagram.meta, diagram.nodes, diagram.edges, diagram.code)

      if (!destroyed) {
        setYText(sharedCode)
      }
    }

    const handleSync = (isSynced: boolean) => {
      if (isSynced) seedAndExposeYText()
    }
    provider.on('sync', handleSync)

    // Fallback: if the WS server is offline the sync event never fires;
    // seed from JSON so the editor is not blank.
    const offlineTimer = setTimeout(seedAndExposeYText, 1500)

    return () => {
      destroyed = true
      clearTimeout(offlineTimer)
      provider.off('sync', handleSync)
      yNodes.unobserve(nodesObserver)
      yEdges.unobserve(edgesObserver)
      sharedCode.unobserve(codeObserver)
      manager.destroy()
      destroy()
      yjsDestroyRef.current = null
      setYjsProvider(null)
      setYText(null)
      setUndoManager(null)
    }
  // Only re-run when the diagram ID changes (different diagram loaded)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram.meta.id])

  // -------------------------------------------------------------------------
  // Auto-save debounce
  // -------------------------------------------------------------------------
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevCodeRef = useRef(diagram.code)

  useEffect(() => {
    if (!isInitialized) return
    if (code === prevCodeRef.current) return
    prevCodeRef.current = code

    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(() => save(), 1500)

    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    }
  }, [code, save, isInitialized])

  // -------------------------------------------------------------------------
  // Mode-switch sync
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isInitialized) return
    const prev = prevModeRef.current
    prevModeRef.current = mode

    // Switching FROM code mode TO visual/split: parse code into nodes/edges
    if (prev === 'code' && (mode === 'visual' || mode === 'split')) {
      const result = syncFromCode(code, diagramType)
      if (result.nodes.length > 0) {
        setStoreNodes(result.nodes)
        setStoreEdges(result.edges)

        // Sync new nodes/edges into Yjs so collaborators see them
        if (yjsProvider) {
          const doc = yjsProvider.doc
          syncNodesToYjs(result.nodes, getSharedNodes(doc))
          syncEdgesToYjs(result.edges, getSharedEdges(doc))
        }
      }
    }

    // Switching FROM visual TO code/split: sync nodes/edges to code
    if (prev === 'visual' && (mode === 'code' || mode === 'split')) {
      if (storeNodes.length > 0) {
        const mermaidCode = syncToCode(storeNodes, storeEdges, diagramType)
        setCode(mermaidCode)
        // Update shared code in Yjs
        if (yjsProvider && yText) {
          const currentText = yText.toString()
          if (currentText !== mermaidCode) {
            yText.delete(0, yText.length)
            yText.insert(0, mermaidCode)
          }
        }
      }
    }
  }, [mode, isInitialized, code, diagramType, storeNodes, storeEdges, setStoreNodes, setStoreEdges, setCode, yjsProvider, yText])

  // -------------------------------------------------------------------------
  // Canvas change handlers
  // -------------------------------------------------------------------------
  const updateCodeFromCanvas = useCallback(
    (nodes: DiagramNode[], edges: DiagramEdge[]) => {
      const mermaidCode = syncToCode(nodes, edges, diagramType)
      setCode(mermaidCode)

      // Update Y.Text so MonacoBinding sees the change
      if (yText) {
        const currentText = yText.toString()
        if (currentText !== mermaidCode) {
          yText.doc?.transact(() => {
            yText.delete(0, yText.length)
            yText.insert(0, mermaidCode)
          })
        }
      }
    },
    [diagramType, setCode, yText],
  )

  const handleCanvasNodesChange = useCallback(
    (nodes: DiagramNode[]) => {
      setStoreNodes(nodes)
      if (mode === 'visual' || mode === 'split') {
        const edges = useDiagramStore.getState().edges
        updateCodeFromCanvas(nodes, edges)

        if (yjsProvider) {
          syncNodesToYjs(nodes, getSharedNodes(yjsProvider.doc))
        }
      }
    },
    [mode, setStoreNodes, updateCodeFromCanvas, yjsProvider],
  )

  const handleCanvasEdgesChange = useCallback(
    (edges: DiagramEdge[]) => {
      setStoreEdges(edges)
      if (mode === 'visual' || mode === 'split') {
        const nodes = useDiagramStore.getState().nodes
        updateCodeFromCanvas(nodes, edges)

        if (yjsProvider) {
          syncEdgesToYjs(edges, getSharedEdges(yjsProvider.doc))
        }
      }
    },
    [mode, setStoreEdges, updateCodeFromCanvas, yjsProvider],
  )

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------
  const handleDeleteSelected = useCallback(() => {
    // React Flow nodes/edges carry a `selected` boolean at runtime even though
    // our DiagramNode/DiagramEdge types don't model it – cast to access it.
    type WithSelected = { selected?: boolean }
    const remaining = storeNodes.filter((n) => !(n as unknown as WithSelected).selected)
    if (remaining.length < storeNodes.length) handleCanvasNodesChange(remaining)
    const remainingEdges = storeEdges.filter((e) => !(e as unknown as WithSelected).selected)
    if (remainingEdges.length < storeEdges.length) handleCanvasEdgesChange(remainingEdges)
  }, [storeNodes, storeEdges, handleCanvasNodesChange, handleCanvasEdgesChange])

  const handleDeselect = useCallback(() => {
    setStoreNodes(storeNodes.map((n) => ({ ...n, selected: false })))
    setStoreEdges(storeEdges.map((e) => ({ ...e, selected: false })))
  }, [storeNodes, storeEdges, setStoreNodes, setStoreEdges])

  useKeyboardShortcuts({
    onSave: save,
    undoManager,
    onDeleteSelected: handleDeleteSelected,
    onDeselect: handleDeselect,
  })

  // -------------------------------------------------------------------------
  // Title editing
  // -------------------------------------------------------------------------
  const handleTitleClick = useCallback(() => {
    setIsEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }, [])

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false)
    save()
  }, [save])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        setIsEditingTitle(false)
        save()
      }
      if (e.key === 'Escape') setIsEditingTitle(false)
    },
    [save],
  )

  const formatSavedTime = useCallback((iso: string | null) => {
    if (!iso) return ''
    const date = new Date(iso)
    return `Saved ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }, [])

  // Manual sync: regenerate code from the current canvas nodes/edges
  const handleSyncCode = useCallback(() => {
    if (storeNodes.length === 0) return
    const mermaidCode = syncToCode(storeNodes, storeEdges, diagramType)
    setCode(mermaidCode)
    if (yText) {
      const currentText = yText.toString()
      if (currentText !== mermaidCode) {
        yText.doc?.transact(() => {
          yText.delete(0, yText.length)
          yText.insert(0, mermaidCode)
        })
      }
    }
  }, [storeNodes, storeEdges, diagramType, setCode, yText])

  const modeIcons: Record<EditorMode, string> = {
    code: 'Code',
    split: 'Split',
    visual: 'Visual',
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border px-4 py-2 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted hover:text-foreground transition-colors text-sm flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-70">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </Link>

          <div className="h-4 w-px bg-border" />

          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="font-medium bg-surface border border-border rounded px-2 py-0.5 text-foreground outline-none focus:border-accent transition-colors"
              autoFocus
            />
          ) : (
            <button
              onClick={handleTitleClick}
              className="font-medium hover:text-accent transition-colors cursor-text"
              title="Click to edit title"
            >
              {title}
            </button>
          )}

          <span className="text-xs text-muted capitalize px-2 py-0.5 bg-surface rounded-md border border-border/50">
            {diagram.meta.type}
          </span>

          <span className="text-xs text-muted">
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Saving...
              </span>
            ) : lastSavedAt ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {formatSavedTime(lastSavedAt)}
              </span>
            ) : null}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Collaboration status – connection + remote user avatars */}
          <CollaborationStatus provider={yjsProvider} />

          {(mode === 'split' || mode === 'visual') && storeNodes.length > 0 && (
            <button
              onClick={handleSyncCode}
              className="px-3 py-1 text-xs font-medium rounded-md bg-surface border border-border/50 text-muted hover:text-foreground hover:bg-surface-hover transition-all"
              title="Regenerate Mermaid code from canvas"
            >
              Sync Code
            </button>
          )}

          <ExportMenu />

          <div className="flex gap-0.5 bg-surface rounded-lg p-0.5 border border-border/50">
            {(['code', 'split', 'visual'] as EditorMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  mode === m
                    ? 'bg-accent text-white shadow-sm shadow-accent/25'
                    : 'text-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                {modeIcons[m]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {(mode === 'code' || mode === 'split') && (
          <div className={`flex flex-col ${mode === 'split' ? 'w-1/2 border-r border-border' : 'w-full'}`}>
            <CodeEditor yText={yText} provider={yjsProvider} />
          </div>
        )}

        {mode === 'split' && (
          <div className="flex flex-col w-1/2">
            <Canvas
              nodes={storeNodes}
              edges={storeEdges}
              onNodesUpdate={handleCanvasNodesChange}
              onEdgesUpdate={handleCanvasEdgesChange}
            />
          </div>
        )}

        {mode === 'code' && (
          <div className="w-[400px] border-l border-border">
            <MermaidPreview />
          </div>
        )}

        {mode === 'visual' && (
          <div className="flex-1">
            <Canvas
              nodes={storeNodes}
              edges={storeEdges}
              onNodesUpdate={handleCanvasNodesChange}
              onEdgesUpdate={handleCanvasEdgesChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
