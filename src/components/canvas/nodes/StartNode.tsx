'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { StartNodeData } from '@/lib/types/uml'

type StartNodeType = Node<StartNodeData, 'start'>

function StartNodeComponent({ selected }: NodeProps<StartNodeType>) {
  return (
    <div
      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors ${
        selected ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''
      }`}
      style={{ backgroundColor: '#e4e4e7' }}
    >
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
        type="source"
        position={Position.Left}
        id="left"
        className="!bg-accent !border-accent !w-2 !h-2"
      />
    </div>
  )
}

export const StartNode = memo(StartNodeComponent)
