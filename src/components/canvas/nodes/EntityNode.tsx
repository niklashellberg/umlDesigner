'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { EntityNodeData } from '@/lib/types/uml'

type EntityNodeType = Node<EntityNodeData, 'entity'>

function EntityNodeComponent({ data, selected }: NodeProps<EntityNodeType>) {
  return (
    <div
      className={`min-w-[180px] bg-surface border rounded-lg shadow-lg overflow-hidden transition-colors ${
        selected ? 'border-accent shadow-accent/20' : 'border-border'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent !border-accent !w-2 !h-2" />

      {/* Header */}
      <div className="px-3 py-2 bg-surface border-b border-border text-center">
        <div className="text-sm font-bold text-foreground leading-tight">
          {data.label || 'Entity'}
        </div>
      </div>

      {/* Attributes */}
      <div className="px-3 py-1.5 min-h-[24px]">
        {data.attributes.length > 0 ? (
          data.attributes.map((attr, i) => (
            <div key={i} className="text-xs text-foreground/80 font-mono leading-relaxed">
              {attr}
            </div>
          ))
        ) : (
          <div className="text-xs text-muted/50 italic">No attributes</div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-accent !border-accent !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-accent !border-accent !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-accent !border-accent !w-2 !h-2" />
    </div>
  )
}

export const EntityNode = memo(EntityNodeComponent)
