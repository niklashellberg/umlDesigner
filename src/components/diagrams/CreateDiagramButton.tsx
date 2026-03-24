'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { DiagramType } from '@/lib/types/diagram'

export function CreateDiagramButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  async function handleCreate(type: DiagramType) {
    const res = await fetch('/api/mcp/diagrams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled Diagram', type }),
    })
    const { id } = await res.json()
    router.push(`/diagram/${id}`)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
      >
        New Diagram
      </button>
    )
  }

  return (
    <div className="flex gap-2">
      {(['class', 'sequence', 'flowchart'] as DiagramType[]).map((type) => (
        <button
          key={type}
          onClick={() => handleCreate(type)}
          className="px-3 py-2 text-sm font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors capitalize"
        >
          {type}
        </button>
      ))}
      <button
        onClick={() => setIsOpen(false)}
        className="px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
