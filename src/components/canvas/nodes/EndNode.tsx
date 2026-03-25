'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { EndNodeData } from '@/lib/types/uml'

type EndNodeType = Node<EndNodeData, 'end'>

function EndNodeComponent({ selected }: NodeProps<EndNodeType>) {
  return (
    <div
      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center border-[3px] transition-colors ${
        selected ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''
      }`}
      style={{ borderColor: '#e4e4e7' }}
    >
      <div
        className="w-[16px] h-[16px] rounded-full"
        style={{ backgroundColor: '#e4e4e7' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-accent !border-accent !w-2 !h-2"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-accent !border-accent !w-2 !h-2"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!bg-accent !border-accent !w-2 !h-2"
      />
    </div>
  )
}

export const EndNode = memo(EndNodeComponent)
