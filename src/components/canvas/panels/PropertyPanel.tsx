'use client'

import { useCallback, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { ClassNodeData, InterfaceNodeData, ProcessNodeData } from '@/lib/types/uml'
import type { DiagramNode } from '@/lib/types/diagram'

interface Props {
  selectedNode: DiagramNode | null
  onClose: () => void
}

export function PropertyPanel({ selectedNode, onClose }: Props) {
  if (!selectedNode) return null

  return (
    <div className="absolute top-3 right-3 z-10 w-[280px] bg-surface/95 backdrop-blur-sm border border-border rounded-xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-foreground uppercase tracking-wider">
          Properties
        </span>
        <button
          onClick={onClose}
          className="text-muted hover:text-foreground transition-colors p-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3L11 11M11 3L3 11" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="p-3 max-h-[70vh] overflow-y-auto">
        {selectedNode.type === 'class' && (
          <ClassProperties node={selectedNode} />
        )}
        {selectedNode.type === 'interface' && (
          <InterfaceProperties node={selectedNode} />
        )}
        {selectedNode.type === 'process' && (
          <ProcessProperties node={selectedNode} />
        )}
      </div>
    </div>
  )
}

function ClassProperties({ node }: { node: DiagramNode }) {
  const { setNodes } = useReactFlow()
  const data = node.data as unknown as ClassNodeData

  const update = useCallback(
    (partial: Partial<ClassNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, data: { ...n.data, ...partial } } : n,
        ),
      )
    },
    [node.id, setNodes],
  )

  return (
    <div className="flex flex-col gap-3">
      <FieldInput
        label="Class Name"
        value={data.label}
        onChange={(v) => update({ label: v })}
      />
      <FieldInput
        label="Stereotype"
        value={data.stereotype ?? ''}
        onChange={(v) => update({ stereotype: v })}
        placeholder="e.g. abstract, entity"
      />
      <ListEditor
        label="Fields"
        items={data.fields}
        onChange={(items) => update({ fields: items })}
        placeholder="+ name: string"
      />
      <ListEditor
        label="Methods"
        items={data.methods}
        onChange={(items) => update({ methods: items })}
        placeholder="+ getName(): string"
      />
    </div>
  )
}

function InterfaceProperties({ node }: { node: DiagramNode }) {
  const { setNodes } = useReactFlow()
  const data = node.data as unknown as InterfaceNodeData

  const update = useCallback(
    (partial: Partial<InterfaceNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, data: { ...n.data, ...partial } } : n,
        ),
      )
    },
    [node.id, setNodes],
  )

  return (
    <div className="flex flex-col gap-3">
      <FieldInput
        label="Interface Name"
        value={data.label}
        onChange={(v) => update({ label: v })}
      />
      <ListEditor
        label="Methods"
        items={data.methods}
        onChange={(items) => update({ methods: items })}
        placeholder="+ doSomething(): void"
      />
    </div>
  )
}

function ProcessProperties({ node }: { node: DiagramNode }) {
  const { setNodes } = useReactFlow()
  const data = node.data as unknown as ProcessNodeData

  const update = useCallback(
    (partial: Partial<ProcessNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, data: { ...n.data, ...partial } } : n,
        ),
      )
    },
    [node.id, setNodes],
  )

  const shapes: ProcessNodeData['shape'][] = ['rectangle', 'rounded', 'diamond', 'circle']

  return (
    <div className="flex flex-col gap-3">
      <FieldInput
        label="Label"
        value={data.label}
        onChange={(v) => update({ label: v })}
      />
      <div>
        <label className="text-[10px] text-muted uppercase tracking-wider font-medium mb-1 block">
          Shape
        </label>
        <div className="grid grid-cols-2 gap-1">
          {shapes.map((shape) => (
            <button
              key={shape}
              onClick={() => update({ shape })}
              className={`text-xs py-1.5 rounded-md border transition-colors capitalize ${
                data.shape === shape
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-background text-muted hover:text-foreground hover:border-border'
              }`}
            >
              {shape}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-[10px] text-muted uppercase tracking-wider font-medium mb-1 block">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent transition-colors placeholder:text-muted/50"
      />
    </div>
  )
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}) {
  const [newItem, setNewItem] = useState('')

  const addItem = useCallback(() => {
    const trimmed = newItem.trim()
    if (!trimmed) return
    onChange([...items, trimmed])
    setNewItem('')
  }, [newItem, items, onChange])

  const removeItem = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index))
    },
    [items, onChange],
  )

  const updateItem = useCallback(
    (index: number, value: string) => {
      const updated = [...items]
      updated[index] = value
      onChange(updated)
    },
    [items, onChange],
  )

  return (
    <div>
      <label className="text-[10px] text-muted uppercase tracking-wider font-medium mb-1 block">
        {label}
      </label>
      <div className="flex flex-col gap-1">
        {items.map((item, i) => (
          <div key={i} className="flex gap-1">
            <input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              className="flex-1 bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground font-mono outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={() => removeItem(i)}
              className="text-muted hover:text-red-400 transition-colors px-1 shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2L10 10M10 2L2 10" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
        <div className="flex gap-1">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder={placeholder}
            className="flex-1 bg-background border border-border/50 rounded-md px-2 py-1 text-xs text-foreground font-mono outline-none focus:border-accent transition-colors placeholder:text-muted/50"
          />
          <button
            onClick={addItem}
            className="text-muted hover:text-accent transition-colors px-1 shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2V10M2 6H10" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
