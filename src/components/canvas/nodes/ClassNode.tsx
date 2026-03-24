'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { ClassNodeData } from '@/lib/types/uml'

type ClassNodeType = Node<ClassNodeData, 'class'>

function ClassNodeComponent({ data, selected }: NodeProps<ClassNodeType>) {
  return (
    <div
      className={`min-w-[180px] bg-surface border rounded-lg shadow-lg overflow-hidden transition-colors ${
        selected ? 'border-accent shadow-accent/20' : 'border-border'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent !border-accent !w-2 !h-2" />

      {/* Header */}
      <div className="px-3 py-2 bg-surface border-b border-border text-center">
        {data.stereotype && (
          <div className="text-[10px] text-muted italic leading-tight">
            &laquo;{data.stereotype}&raquo;
          </div>
        )}
        <div className="text-sm font-bold text-foreground leading-tight">
          {data.label || 'ClassName'}
        </div>
      </div>

      {/* Fields */}
      <div className="px-3 py-1.5 border-b border-border min-h-[24px]">
        {data.fields.length > 0 ? (
          data.fields.map((field, i) => (
            <div key={i} className="text-xs text-foreground/80 font-mono leading-relaxed">
              {field}
            </div>
          ))
        ) : (
          <div className="text-xs text-muted/50 italic">No fields</div>
        )}
      </div>

      {/* Methods */}
      <div className="px-3 py-1.5 min-h-[24px]">
        {data.methods.length > 0 ? (
          data.methods.map((method, i) => (
            <div key={i} className="text-xs text-foreground/80 font-mono leading-relaxed">
              {method}
            </div>
          ))
        ) : (
          <div className="text-xs text-muted/50 italic">No methods</div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-accent !border-accent !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-accent !border-accent !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-accent !border-accent !w-2 !h-2" />
    </div>
  )
}

export const ClassNode = memo(ClassNodeComponent)
