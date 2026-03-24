'use client'

import {
  useCallback,
  useRef,
  type DragEvent,
  useEffect,
} from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type OnConnect,
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

/**
 * Generates a unique ID for new nodes.
 */
let nodeIdCounter = 0
function getNodeId(): string {
  nodeIdCounter += 1
  return `node_${Date.now()}_${nodeIdCounter}`
}

interface CanvasInnerProps {
  initialNodes: DiagramNode[]
  initialEdges: DiagramEdge[]
  onNodesChange: (nodes: DiagramNode[]) => void
  onEdgesChange: (edges: DiagramEdge[]) => void
}

function CanvasInner({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
}: CanvasInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodes, handleNodesChange] = useNodesState(
    initialNodes as Node[],
  )
  const [edges, setEdges, handleEdgesChange] = useEdgesState(
    initialEdges as Edge[],
  )

  // Sync initial data when props change (e.g., switching from code mode)
  const initialNodesRef = useRef(initialNodes)
  const initialEdgesRef = useRef(initialEdges)

  useEffect(() => {
    if (initialNodes !== initialNodesRef.current) {
      initialNodesRef.current = initialNodes
      setNodes(initialNodes as Node[])
    }
  }, [initialNodes, setNodes])

  useEffect(() => {
    if (initialEdges !== initialEdgesRef.current) {
      initialEdgesRef.current = initialEdges
      setEdges(initialEdges as Edge[])
    }
  }, [initialEdges, setEdges])

  // Propagate changes back to parent
  const nodesRef = useRef(nodes)
  useEffect(() => {
    if (nodes !== nodesRef.current) {
      nodesRef.current = nodes
      onNodesChange(nodes as unknown as DiagramNode[])
    }
  }, [nodes, onNodesChange])

  const edgesRef = useRef(edges)
  useEffect(() => {
    if (edges !== edgesRef.current) {
      edgesRef.current = edges
      onEdgesChange(edges as unknown as DiagramEdge[])
    }
  }, [edges, onEdgesChange])

  // Selected node for property panel
  const selectedNode = nodes.find((n) => n.selected) as DiagramNode | undefined

  const onConnect: OnConnect = useCallback(
    (params) => {
      const defaultData: UmlEdgeData = {
        edgeType: 'association',
        lineStyle: 'solid',
      }
      setEdges((eds) =>
        addEdge(
          { ...params, type: 'uml', data: defaultData },
          eds,
        ),
      )
    },
    [setEdges],
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
      }

      setNodes((nds) => [...nds, newNode])
    },
    [screenToFlowPosition, setNodes],
  )

  const handleDeselectNode = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
  }, [setNodes])

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      <UmlEdgeMarkerDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
        selectedNode={selectedNode ?? null}
        onClose={handleDeselectNode}
      />
    </div>
  )
}

interface CanvasProps {
  initialNodes: DiagramNode[]
  initialEdges: DiagramEdge[]
  onNodesChange: (nodes: DiagramNode[]) => void
  onEdgesChange: (edges: DiagramEdge[]) => void
}

/**
 * Canvas component wraps the inner flow in a ReactFlowProvider.
 * This is required by React Flow to use hooks like useReactFlow.
 */
export function Canvas({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
}: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      />
    </ReactFlowProvider>
  )
}
