'use client'

import {
  useCallback,
  useRef,
  type DragEvent,
} from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { nodeTypes } from './nodes'
import { edgeTypes, UmlEdgeMarkerDefs } from './edges'
import { ToolPanel } from './panels/ToolPanel'
import { PropertyPanel } from './panels/PropertyPanel'
import type { DiagramNode, DiagramEdge } from '@/lib/types/diagram'
import type { UmlEdgeData } from '@/lib/types/uml'

let nodeIdCounter = 0
function getNodeId(): string {
  nodeIdCounter += 1
  return `node_${Date.now()}_${nodeIdCounter}`
}

interface CanvasInnerProps {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  onNodesUpdate: (nodes: DiagramNode[]) => void
  onEdgesUpdate: (edges: DiagramEdge[]) => void
}

function CanvasInner({
  nodes,
  edges,
  onNodesUpdate,
  onEdgesUpdate,
}: CanvasInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const rfNodes = nodes as Node[]
  const rfEdges = edges as Edge[]

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updated = applyNodeChanges(changes, rfNodes)
      onNodesUpdate(updated as unknown as DiagramNode[])
    },
    [rfNodes, onNodesUpdate],
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const updated = applyEdgeChanges(changes, rfEdges)
      onEdgesUpdate(updated as unknown as DiagramEdge[])
    },
    [rfEdges, onEdgesUpdate],
  )

  const selectedNode = nodes.find(
    (n) => (n as unknown as { selected?: boolean }).selected,
  ) ?? null

  const onConnect: OnConnect = useCallback(
    (params) => {
      const defaultData: UmlEdgeData = {
        edgeType: 'association',
        lineStyle: 'solid',
      }
      const updated = addEdge(
        { ...params, type: 'uml', data: defaultData },
        rfEdges,
      )
      onEdgesUpdate(updated as unknown as DiagramEdge[])
    },
    [rfEdges, onEdgesUpdate],
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      const raw = event.dataTransfer.getData('application/reactflow')
      if (!raw) return

      let parsed: { type: string; data: Record<string, unknown> }
      try {
        parsed = JSON.parse(raw) as { type: string; data: Record<string, unknown> }
      } catch {
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: getNodeId(),
        type: parsed.type,
        position,
        data: parsed.data,
        ...(parsed.type === 'swimlane' ? { zIndex: -1, dragHandle: '.swimlane-header' } : {}),
      }

      onNodesUpdate([...rfNodes, newNode] as unknown as DiagramNode[])
    },
    [screenToFlowPosition, rfNodes, onNodesUpdate],
  )

  const handleDeselectNode = useCallback(() => {
    const updated = rfNodes.map((n) => ({ ...n, selected: false }))
    onNodesUpdate(updated as unknown as DiagramNode[])
  }, [rfNodes, onNodesUpdate])

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      <UmlEdgeMarkerDefs />
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="!bg-background"
        defaultEdgeOptions={{ type: 'uml' }}
        disableKeyboardA11y
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2e2e3a"
        />
        <Controls
          className="!bg-surface !border-border !shadow-lg [&>button]:!bg-surface [&>button]:!border-border [&>button]:!text-muted [&>button:hover]:!bg-surface-hover [&>button:hover]:!text-foreground [&>button>svg]:!fill-current"
        />
        <MiniMap
          className="!bg-surface !border-border !shadow-lg"
          nodeColor="#6366f1"
          maskColor="rgba(15, 15, 19, 0.7)"
        />
      </ReactFlow>
      <ToolPanel />
      <PropertyPanel
        selectedNode={selectedNode as DiagramNode | null}
        onClose={handleDeselectNode}
      />
    </div>
  )
}

interface CanvasProps {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  onNodesUpdate: (nodes: DiagramNode[]) => void
  onEdgesUpdate: (edges: DiagramEdge[]) => void
}

export function Canvas({
  nodes,
  edges,
  onNodesUpdate,
  onEdgesUpdate,
}: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        nodes={nodes}
        edges={edges}
        onNodesUpdate={onNodesUpdate}
        onEdgesUpdate={onEdgesUpdate}
      />
    </ReactFlowProvider>
  )
}
