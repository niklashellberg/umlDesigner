'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { ActivityNodeData } from '@/lib/types/uml'

type ActivityNodeType = Node<ActivityNodeData, 'activity'>

function ActivityNodeComponent({ data, selected }: NodeProps<ActivityNodeType>) {
  const label = data.label || 'Activity'

  const borderClass = selected
    ? 'border-accent shadow-accent/20'
    : 'border-border'

  return (
    <div
      className={`min-w-[120px] px-4 py-3 bg-surface border rounded-2xl shadow-lg flex items-center justify-center transition-colors ${borderClass}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-accent !border-accent !w-2 !h-2"
      />
      <span className="text-xs font-medium text-foreground text-center">
        {label}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-accent !border-accent !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-accent !border-accent !w-2 !h-2"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-accent !border-accent !w-2 !h-2"
      />
    </div>
  )
}

export const ActivityNode = memo(ActivityNodeComponent)
