'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { DiagramType } from '@/lib/types/diagram'

interface DiagramTypeCard {
  type: DiagramType
  label: string
  description: string
  icon: string
  example: string
}

const diagramTypes: DiagramTypeCard[] = [
  {
    type: 'class',
    label: 'Class Diagram',
    description: 'Model object-oriented structures, relationships, and inheritance hierarchies.',
    icon: '\u25A1',
    example: 'Classes, interfaces, inheritance',
  },
  {
    type: 'sequence',
    label: 'Sequence Diagram',
    description: 'Visualise interactions between components or actors over time.',
    icon: '\u2192',
    example: 'API flows, request/response cycles',
  },
  {
    type: 'flowchart',
    label: 'Flowchart',
    description: 'Document processes, decision trees, and system workflows.',
    icon: '\u25C7',
    example: 'Business logic, user journeys',
  },
  {
    type: 'activity',
    label: 'Activity Diagram',
    description: 'Model workflows with swimlanes, forks, and parallel activities.',
    icon: '\u2261',
    example: 'Swimlanes, concurrent processes',
  },
  {
    type: 'state',
    label: 'State Diagram',
    description: 'Model state machines with transitions, initial and final states.',
    icon: '\u25CB',
    example: 'Lifecycles, protocol states',
  },
  {
    type: 'er',
    label: 'ER Diagram',
    description: 'Design entity-relationship models for databases and data schemas.',
    icon: '\u229E',
    example: 'Tables, relationships, attributes',
  },
]

export function EmptyState() {
  const router = useRouter()
  const [creating, setCreating] = useState<DiagramType | null>(null)

  async function handleCreate(type: DiagramType) {
    if (creating) return
    setCreating(type)
    try {
      const res = await fetch('/api/mcp/diagrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Diagram', type }),
      })
      const { id } = await res.json()
      router.push(`/diagram/${id}`)
    } catch {
      setCreating(null)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="mb-8">
        <div className="text-5xl opacity-20 mb-4">&#9649;</div>
        <h2 className="text-xl font-semibold mb-2">Start with a diagram type</h2>
        <p className="text-sm text-muted max-w-md">
          Choose a diagram type below to create your first diagram and get started immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
        {diagramTypes.map(({ type, label, description, icon, example }) => (
          <button
            key={type}
            onClick={() => handleCreate(type)}
            disabled={creating !== null}
            className="text-left p-5 bg-surface hover:bg-surface-hover border border-border hover:border-accent/50 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-3xl mb-3 opacity-50 group-hover:opacity-80 transition-opacity">
              {creating === type ? (
                <span className="inline-block h-7 w-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              ) : (
                icon
              )}
            </div>
            <h3 className="font-semibold text-sm mb-1 group-hover:text-accent transition-colors">
              {label}
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-2">{description}</p>
            <p className="text-xs text-muted/60 italic">{example}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
