'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { StateNodeData } from '@/lib/types/uml'

type StateNodeType = Node<StateNodeData, 'state'>

function StateNodeComponent({ data, selected }: NodeProps<StateNodeType>) {
  return (
    <div
      className={`min-w-[120px] bg-surface border-2 rounded-full shadow-lg px-5 py-3 text-center transition-colors ${
        selected ? 'border-accent shadow-accent/20' : 'border-border'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent !border-accent !w-2 !h-2" />

      <div className="text-sm font-medium text-foreground">
        {data.label || 'State'}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-accent !border-accent !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-accent !border-accent !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-accent !border-accent !w-2 !h-2" />
    </div>
  )
}

export const StateNode = memo(StateNodeComponent)
