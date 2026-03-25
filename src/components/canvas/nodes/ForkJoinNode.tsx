'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { ForkJoinNodeData } from '@/lib/types/uml'

type ForkJoinNodeType = Node<ForkJoinNodeData, 'forkJoin'>

function ForkJoinNodeComponent({ selected }: NodeProps<ForkJoinNodeType>) {
  return (
    <div
      className={`w-[200px] h-[8px] rounded-full transition-colors ${
        selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''
      }`}
      style={{ backgroundColor: '#71717a' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-accent !border-accent !w-2 !h-2"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-left"
        className="!bg-accent !border-accent !w-2 !h-2"
        style={{ left: '25%' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-right"
        className="!bg-accent !border-accent !w-2 !h-2"
        style={{ left: '75%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-accent !border-accent !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-left"
        className="!bg-accent !border-accent !w-2 !h-2"
        style={{ left: '25%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right"
        className="!bg-accent !border-accent !w-2 !h-2"
        style={{ left: '75%' }}
      />
    </div>
  )
}

export const ForkJoinNode = memo(ForkJoinNodeComponent)
