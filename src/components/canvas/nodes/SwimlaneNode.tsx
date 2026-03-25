'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node, NodeResizer } from '@xyflow/react'
import type { SwimlaneNodeData } from '@/lib/types/uml'

type SwimlaneNodeType = Node<SwimlaneNodeData, 'swimlane'>

function SwimlaneNodeComponent({ data, selected }: NodeProps<SwimlaneNodeType>) {
  const label = data.label || 'Lane'
  const width = data.width || 250
  const height = data.height || 500

  return (
    <div
      style={{ width, height }}
      className="relative"
    >
      <NodeResizer
        isVisible={selected ?? false}
        minWidth={180}
        minHeight={300}
        lineClassName="!border-accent/50"
        handleClassName="!bg-accent !border-accent !w-2 !h-2"
      />

      {/* Background */}
      <div
        className={`absolute inset-0 rounded-xl border transition-colors ${
          selected ? 'border-accent/60' : 'border-border'
        }`}
        style={{
          backgroundColor: 'rgba(26, 26, 34, 0.25)',
          borderStyle: 'dashed',
        }}
      />

      {/* Header - this is the drag handle */}
      <div
        className="swimlane-header absolute top-0 left-0 right-0 h-9 rounded-t-xl flex items-center justify-center cursor-grab active:cursor-grabbing border-b"
        style={{
          backgroundColor: 'rgba(26, 26, 34, 0.8)',
          borderColor: selected ? 'rgba(99, 102, 241, 0.6)' : '#2e2e3a',
        }}
      >
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          {label}
        </span>
      </div>

      {/* Hidden handles for edge connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-accent/50 !border-accent/50 !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-accent/50 !border-accent/50 !w-2 !h-2"
      />
    </div>
  )
}

export const SwimlaneNode = memo(SwimlaneNodeComponent)
