'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { DiagramMeta, DiagramType } from '@/lib/types/diagram'

interface Props {
  projectId: string
  existingDiagramIds: string[]
  onDiagramAdded: () => void
}

export function AddDiagramToProject({ projectId, existingDiagramIds, onDiagramAdded }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateType, setShowCreateType] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowCreateType(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const fetchDiagrams = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/mcp/diagrams')
      const all: DiagramMeta[] = await res.json()
      const existingSet = new Set(existingDiagramIds)
      setDiagrams(all.filter((d) => !existingSet.has(d.id)))
    } finally {
      setIsLoading(false)
    }
  }, [existingDiagramIds])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    fetchDiagrams()
  }, [fetchDiagrams])

  const handleAddDiagram = useCallback(
    async (diagramId: string) => {
      await fetch(`/api/mcp/projects/${projectId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagramId }),
      })
      setIsOpen(false)
      setShowCreateType(false)
      onDiagramAdded()
    },
    [projectId, onDiagramAdded],
  )

  const handleCreateAndAdd = useCallback(
    async (type: DiagramType) => {
      const res = await fetch('/api/mcp/diagrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Diagram', type }),
      })
      const { id } = await res.json()
      await handleAddDiagram(id)
      router.push(`/diagram/${id}`)
    },
    [handleAddDiagram, router],
  )

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="px-3 py-1.5 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
      >
        Add Diagram
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(false)
          setShowCreateType(false)
        }}
        className="px-3 py-1.5 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
      >
        Add Diagram
      </button>

      <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden">
        {/* Create new section */}
        <div className="p-2 border-b border-border">
          {showCreateType ? (
            <div className="flex flex-wrap gap-1">
              {(['class', 'sequence', 'flowchart', 'activity', 'state', 'er'] as DiagramType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleCreateAndAdd(type)}
                  className="px-2 py-1 text-xs font-medium bg-background hover:bg-surface-hover border border-border rounded transition-colors capitalize"
                >
                  {type}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setShowCreateType(true)}
              className="w-full text-left px-2 py-1.5 text-sm text-accent hover:bg-surface-hover rounded transition-colors"
            >
              + Create New Diagram
            </button>
          )}
        </div>

        {/* Existing diagrams list */}
        <div className="max-h-60 overflow-y-auto">
          {isLoading ? (
            <p className="p-3 text-sm text-muted text-center">Loading...</p>
          ) : diagrams.length === 0 ? (
            <p className="p-3 text-sm text-muted text-center">No ungrouped diagrams available</p>
          ) : (
            diagrams.map((d) => (
              <button
                key={d.id}
                onClick={() => handleAddDiagram(d.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover transition-colors flex items-center justify-between"
              >
                <span className="truncate">{d.title}</span>
                <span className="text-xs text-muted capitalize ml-2 shrink-0">{d.type}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
