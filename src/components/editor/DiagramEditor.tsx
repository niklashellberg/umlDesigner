'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Diagram } from '@/lib/types/diagram'
import { useDiagramStore } from '@/lib/store/diagram-store'
import { CodeEditor } from '@/components/code-editor/CodeEditor'
import { MermaidPreview } from '@/components/code-editor/MermaidPreview'
import { ExportMenu } from '@/components/editor/ExportMenu'

type EditorMode = 'code' | 'split' | 'visual'

interface Props {
  diagram: Diagram
}

export function DiagramEditor({ diagram }: Props) {
  const [mode, setMode] = useState<EditorMode>('split')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const initialize = useDiagramStore((s) => s.initialize)
  const title = useDiagramStore((s) => s.meta?.title ?? '')
  const setTitle = useDiagramStore((s) => s.setTitle)
  const code = useDiagramStore((s) => s.code)
  const save = useDiagramStore((s) => s.save)
  const isSaving = useDiagramStore((s) => s.isSaving)
  const lastSavedAt = useDiagramStore((s) => s.lastSavedAt)
  const isInitialized = useDiagramStore((s) => s.isInitialized)

  useEffect(() => {
    initialize(diagram)
  }, [diagram, initialize])

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevCodeRef = useRef(diagram.code)

  useEffect(() => {
    if (!isInitialized) return
    if (code === prevCodeRef.current) return
    prevCodeRef.current = code

    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current)
    }

    saveDebounceRef.current = setTimeout(() => {
      save()
    }, 1500)

    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current)
      }
    }
  }, [code, save, isInitialized])

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
      if (e.key === 'Escape') {
        setIsEditingTitle(false)
      }
    },
    [save],
  )

  const formatSavedTime = useCallback((iso: string | null) => {
    if (!iso) return ''
    const date = new Date(iso)
    return `Saved ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }, [])

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
            <CodeEditor />
          </div>
        )}

        {mode === 'split' && (
          <div className="flex flex-col w-1/2">
            <MermaidPreview />
          </div>
        )}

        {mode === 'code' && (
          <div className="w-[400px] border-l border-border">
            <MermaidPreview />
          </div>
        )}

        {mode === 'visual' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center text-muted">
              <div className="text-center">
                <div className="mb-3 mx-auto w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <p className="text-sm font-medium mb-1">Visual Editor</p>
                <p className="text-xs text-muted">Drag-and-drop canvas coming in Phase 3</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
