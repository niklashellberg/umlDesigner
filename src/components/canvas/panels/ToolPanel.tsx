'use client'

import { type DragEvent } from 'react'

interface ToolItem {
  type: string
  label: string
  icon: React.ReactNode
  data: Record<string, unknown>
}

const tools: ToolItem[] = [
  {
    type: 'class',
    label: 'Class',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </svg>
    ),
    data: { label: 'ClassName', stereotype: '', fields: [], methods: [] },
  },
  {
    type: 'interface',
    label: 'Interface',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
        <line x1="3" y1="11" x2="21" y2="11" />
      </svg>
    ),
    data: { label: 'InterfaceName', methods: [] },
  },
  {
    type: 'process',
    label: 'Process',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="5" width="18" height="14" rx="2" />
      </svg>
    ),
    data: { label: 'Process', shape: 'rectangle' },
  },
  {
    type: 'process',
    label: 'Decision',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3 L21 12 L12 21 L3 12 Z" />
      </svg>
    ),
    data: { label: 'Condition?', shape: 'diamond' },
  },
]

function onDragStart(event: DragEvent, item: ToolItem) {
  const payload = JSON.stringify({ type: item.type, data: item.data })
  event.dataTransfer.setData('application/reactflow', payload)
  event.dataTransfer.effectAllowed = 'move'
}

export function ToolPanel() {
  return (
    <div className="absolute top-3 left-3 z-10 bg-surface/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-2 flex flex-col gap-1">
      <div className="text-[10px] text-muted uppercase tracking-wider font-medium px-2 py-1">
        Elements
      </div>
      {tools.map((item, idx) => (
        <div
          key={idx}
          draggable
          onDragStart={(e) => onDragStart(e, item)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-surface-hover transition-colors text-muted hover:text-foreground"
          title={`Drag to add ${item.label}`}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            {item.icon}
          </div>
          <span className="text-xs font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
