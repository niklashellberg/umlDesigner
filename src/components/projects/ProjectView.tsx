'use client'

import Link from 'next/link'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AddDiagramToProject } from './AddDiagramToProject'
import { MergedExportButton } from './MergedExportButton'

interface EnrichedItem {
  diagramId: string
  order: number
  title: string
  type: string
  updatedAt: string
}

interface Props {
  projectId: string
  initialTitle: string
  initialItems: EnrichedItem[]
}

const typeIcons: Record<string, string> = {
  class: '\u25A1',
  sequence: '\u2192',
  flowchart: '\u25C7',
  activity: '\u2261',
  state: '\u25CB',
  er: '\u229E',
}

export function ProjectView({ projectId, initialTitle, initialItems }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [items, setItems] = useState(initialItems)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const originalTitleRef = useRef(initialTitle)

  // Title editing
  const handleTitleClick = useCallback(() => {
    originalTitleRef.current = title
    setIsEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }, [title])

  const saveTitle = useCallback(async () => {
    setIsEditingTitle(false)
    if (title !== originalTitleRef.current) {
      await fetch(`/api/mcp/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
    }
  }, [title, projectId])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') saveTitle()
      if (e.key === 'Escape') {
        setTitle(originalTitleRef.current)
        setIsEditingTitle(false)
      }
    },
    [saveTitle],
  )

  // Remove diagram from project
  const handleRemove = useCallback(
    async (diagramId: string) => {
      const res = await fetch(`/api/mcp/projects/${projectId}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagramId }),
      })
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.diagramId !== diagramId))
      }
    },
    [projectId],
  )

  // Drag & drop reordering
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }, [])

  const handleDrop = useCallback(
    async (targetIndex: number) => {
      if (dragIndex === null || dragIndex === targetIndex) {
        setDragIndex(null)
        setDragOverIndex(null)
        return
      }

      const newItems = [...items]
      const [moved] = newItems.splice(dragIndex, 1)
      newItems.splice(targetIndex, 0, moved)

      const reordered = newItems.map((item, idx) => ({ ...item, order: idx }))
      setItems(reordered)
      setDragIndex(null)
      setDragOverIndex(null)

      await fetch(`/api/mcp/projects/${projectId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reordered.map((i) => ({ diagramId: i.diagramId, order: i.order })),
        }),
      })
    },
    [dragIndex, items, projectId],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  // Called when a diagram is added via the AddDiagramToProject component
  const handleDiagramAdded = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-sm">
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
              onBlur={saveTitle}
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

          <span className="text-xs text-muted px-2 py-0.5 bg-surface rounded-md border border-border/50">
            {items.length} {items.length === 1 ? 'diagram' : 'diagrams'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <AddDiagramToProject
            projectId={projectId}
            existingDiagramIds={items.map((i) => i.diagramId)}
            onDiagramAdded={handleDiagramAdded}
          />
          {items.length > 0 && (
            <MergedExportButton projectTitle={title} items={items} />
          )}
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted text-lg mb-2">No diagrams yet</p>
            <p className="text-muted text-sm">Add existing diagrams or create new ones to get started.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            {items.map((item, index) => (
              <div
                key={item.diagramId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 bg-surface hover:bg-surface-hover border rounded-lg transition-colors group ${
                  dragOverIndex === index ? 'border-accent' : 'border-border'
                } ${dragIndex === index ? 'opacity-50' : ''}`}
              >
                <span
                  className="text-muted cursor-grab active:cursor-grabbing select-none text-lg"
                  title="Drag to reorder"
                >
                  &#x2261;
                </span>

                <Link
                  href={`/diagram/${item.diagramId}`}
                  className="flex-1 flex items-center gap-3 min-w-0"
                >
                  <span className="text-lg opacity-50">
                    {typeIcons[item.type] || '\u25A1'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate hover:text-accent transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted">
                      {item.type} {item.updatedAt ? `\u00B7 ${getRelativeTime(item.updatedAt)}` : ''}
                    </p>
                  </div>
                </Link>

                <span className="text-xs text-muted capitalize px-2 py-0.5 bg-background rounded border border-border/50">
                  {item.type}
                </span>

                <button
                  onClick={() => handleRemove(item.diagramId)}
                  className="p-1 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from project"
                  aria-label="Remove from project"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
