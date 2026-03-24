'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { ProcessNodeData } from '@/lib/types/uml'

type ProcessNodeType = Node<ProcessNodeData, 'process'>

function ProcessNodeComponent({ data, selected }: NodeProps<ProcessNodeType>) {
  const shape = data.shape || 'rectangle'
  const label = data.label || 'Process'

  const borderClass = selected
    ? 'border-accent shadow-accent/20'
    : 'border-border'

  if (shape === 'diamond') {
    return (
      <div className="relative w-[120px] h-[120px] flex items-center justify-center">
        <Handle type="target" position={Position.Top} className="!bg-accent !border-accent !w-2 !h-2" />
        <div
          className={`absolute inset-0 bg-surface border shadow-lg transition-colors ${borderClass}`}
          style={{ transform: 'rotate(45deg)', borderRadius: '4px' }}
        />
        <span className="relative z-10 text-xs font-medium text-foreground text-center px-2 max-w-[80px] leading-tight">
          {label}
        </span>
        <Handle type="source" position={Position.Bottom} className="!bg-accent !border-accent !w-2 !h-2" />
        <Handle type="source" position={Position.Right} id="right" className="!bg-accent !border-accent !w-2 !h-2" />
        <Handle type="target" position={Position.Left} id="left" className="!bg-accent !border-accent !w-2 !h-2" />
      </div>
    )
  }

  if (shape === 'circle') {
    return (
      <div
        className={`w-[60px] h-[60px] rounded-full bg-surface border shadow-lg flex items-center justify-center transition-colors ${borderClass}`}
      >
        <Handle type="target" position={Position.Top} className="!bg-accent !border-accent !w-2 !h-2" />
        <span className="text-[10px] font-medium text-foreground text-center leading-tight">
          {label}
        </span>
        <Handle type="source" position={Position.Bottom} className="!bg-accent !border-accent !w-2 !h-2" />
        <Handle type="source" position={Position.Right} id="right" className="!bg-accent !border-accent !w-2 !h-2" />
        <Handle type="target" position={Position.Left} id="left" className="!bg-accent !border-accent !w-2 !h-2" />
      </div>
    )
  }

  const roundedClass = shape === 'rounded' ? 'rounded-2xl' : 'rounded-lg'

  return (
    <div
      className={`min-w-[120px] px-4 py-3 bg-surface border shadow-lg flex items-center justify-center transition-colors ${roundedClass} ${borderClass}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent !border-accent !w-2 !h-2" />
      <span className="text-xs font-medium text-foreground text-center">
        {label}
      </span>
      <Handle type="source" position={Position.Bottom} className="!bg-accent !border-accent !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-accent !border-accent !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-accent !border-accent !w-2 !h-2" />
    </div>
  )
}

export const ProcessNode = memo(ProcessNodeComponent)
