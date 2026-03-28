import type { DiagramNode, DiagramEdge, DiagramType } from '@/lib/types/diagram'
import type { ClassNodeData, ProcessNodeData, ActivityNodeData, SwimlaneNodeData, UmlEdgeType } from '@/lib/types/uml'

/**
 * Parses Mermaid diagram code into React Flow nodes and edges.
 * Uses regex-based parsing for the supported Mermaid subset.
 *
 * When `existingPositions` is provided, parsed nodes whose IDs match a key
 * in the map will reuse the saved position instead of being auto-laid-out.
 */
export function mermaidToFlow(
  code: string,
  diagramType: DiagramType,
  existingPositions?: Map<string, { x: number; y: number }>,
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const trimmed = code.trim()

  let result: { nodes: DiagramNode[]; edges: DiagramEdge[] }

  // Use the explicit diagramType parameter — it always takes priority.
  // Content sniffing is only used as a last resort when the diagramType
  // doesn't map to a known parser (e.g. future types we haven't built yet).
  if (diagramType === 'class') {
    result = parseClassDiagram(trimmed)
  } else if (diagramType === 'activity') {
    result = parseActivity(trimmed)
  } else if (diagramType === 'flowchart') {
    result = parseFlowchart(trimmed)
  } else {
    // No parser for this diagramType — return empty.
    // We intentionally do NOT content-sniff here because the caller
    // explicitly requested a specific type; falling back to a different
    // parser based on code content would be surprising and incorrect.
    return { nodes: [], edges: [] }
  }

  // Restore saved positions for nodes that already existed on the canvas
  if (existingPositions && existingPositions.size > 0) {
    for (const node of result.nodes) {
      const saved = existingPositions.get(node.id)
      if (saved) {
        node.position = { x: saved.x, y: saved.y }
      }
    }
  }

  return result
}

// ---------- Class Diagram Parsing ----------

interface ParsedClass {
  name: string
  stereotype: string
  fields: string[]
  methods: string[]
}

function parseClassDiagram(code: string): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const lines = code.split('\n').map((l) => l.trim()).filter(Boolean)
  const classes = new Map<string, ParsedClass>()
  const edges: DiagramEdge[] = []

  let currentClass: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip the header
    if (line === 'classDiagram') continue

    // Stereotype line: <<interface>> ClassName
    const stereoMatch = line.match(/^<<(\w+)>>\s+(\w+)$/)
    if (stereoMatch) {
      const [, stereotype, name] = stereoMatch
      ensureClass(classes, name)
      classes.get(name)!.stereotype = stereotype
      continue
    }

    // Class block start: class ClassName {
    const classStart = line.match(/^class\s+(\w+)\s*\{$/)
    if (classStart) {
      const name = classStart[1]
      ensureClass(classes, name)
      currentClass = name
      continue
    }

    // Class block end
    if (line === '}') {
      currentClass = null
      continue
    }

    // Inside a class block - fields or methods
    if (currentClass) {
      const cls = classes.get(currentClass)!
      if (line.includes('(')) {
        cls.methods.push(line)
      } else {
        cls.fields.push(line)
      }
      continue
    }

    // Relationship line: ClassA <|-- ClassB : label
    const relMatch = line.match(
      /^(\w+)\s+(<?(?:\|)?(?:\*|o)?(?:--|\.\.)(?:\*|o)?(?:\|)?>?)\s+(\w+)(?:\s*:\s*(.+))?$/,
    )
    if (relMatch) {
      const [, source, arrow, target, label] = relMatch
      ensureClass(classes, source)
      ensureClass(classes, target)

      const edgeType = parseClassArrow(arrow)
      edges.push({
        id: `e-${source}-${target}`,
        type: 'uml',
        source,
        target,
        label: label || undefined,
        data: {
          edgeType,
          lineStyle: edgeType === 'implementation' || edgeType === 'dependency' ? 'dashed' : 'solid',
        },
      })
      continue
    }
  }

  // Convert classes to nodes with auto-layout
  const nodes: DiagramNode[] = []
  const classNames = Array.from(classes.keys())
  const cols = Math.max(2, Math.ceil(Math.sqrt(classNames.length)))

  classNames.forEach((name, idx) => {
    const cls = classes.get(name)!
    const col = idx % cols
    const row = Math.floor(idx / cols)

    const nodeType = cls.stereotype === 'interface' ? 'interface' : 'class'
    const data: ClassNodeData = {
      label: name,
      stereotype: cls.stereotype,
      fields: cls.fields,
      methods: cls.methods,
    }

    nodes.push({
      id: name,
      type: nodeType,
      position: { x: 50 + col * 280, y: 50 + row * 300 },
      data: data as unknown as Record<string, unknown>,
    })
  })

  return { nodes, edges }
}

function ensureClass(classes: Map<string, ParsedClass>, name: string) {
  if (!classes.has(name)) {
    classes.set(name, { name, stereotype: '', fields: [], methods: [] })
  }
}

function parseClassArrow(arrow: string): UmlEdgeType {
  if (arrow.includes('<|--')) return 'inheritance'
  if (arrow.includes('<|..')) return 'implementation'
  if (arrow.includes('<..') || arrow.includes('..>')) return 'dependency'
  if (arrow.includes('o--') || arrow.includes('--o')) return 'aggregation'
  if (arrow.includes('*--') || arrow.includes('--*')) return 'composition'
  return 'association'
}

// ---------- Flowchart Parsing ----------

function parseFlowchart(code: string): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const lines = code.split('\n').map((l) => l.trim()).filter(Boolean)
  const nodes = new Map<string, DiagramNode>()
  const edges: DiagramEdge[] = []

  for (const line of lines) {
    // Skip header
    if (line.startsWith('flowchart') || line.startsWith('graph')) continue

    // Edge line: supports inline node definitions on both sides.
    // Examples:
    //   A --> B            (bare IDs)
    //   A[Start] --> B     (source with shape)
    //   A --> B[End]       (target with shape)
    //   A[Start] --> B[End] (both with shapes)
    //   A -->|label| B     (with edge label)
    //   A[Start] -->|yes| B{Decision}
    const edgeMatch = line.match(
      /^(\w+)(?:\[([^\]]+)\]|\((\([^)]+\))\)|\(([^)]+)\)|\{([^}]+)\})?\s+-->(?:\|([^|]*)\|)?\s+(\w+)(?:\[([^\]]+)\]|\((\([^)]+\))\)|\(([^)]+)\)|\{([^}]+)\})?$/,
    )
    if (edgeMatch) {
      const [, sourceId, srcRect, srcCircle, srcRounded, srcDiamond, label, targetId, tgtRect, tgtCircle, tgtRounded, tgtDiamond] = edgeMatch

      // Register source node with its inline shape (if present)
      if (srcRect) setFlowNode(nodes, sourceId, srcRect, 'rectangle')
      else if (srcCircle) setFlowNode(nodes, sourceId, srcCircle.slice(1, -1), 'circle')
      else if (srcRounded) setFlowNode(nodes, sourceId, srcRounded, 'rounded')
      else if (srcDiamond) setFlowNode(nodes, sourceId, srcDiamond, 'diamond')
      else ensureFlowNode(nodes, sourceId)

      // Register target node with its inline shape (if present)
      if (tgtRect) setFlowNode(nodes, targetId, tgtRect, 'rectangle')
      else if (tgtCircle) setFlowNode(nodes, targetId, tgtCircle.slice(1, -1), 'circle')
      else if (tgtRounded) setFlowNode(nodes, targetId, tgtRounded, 'rounded')
      else if (tgtDiamond) setFlowNode(nodes, targetId, tgtDiamond, 'diamond')
      else ensureFlowNode(nodes, targetId)

      edges.push({
        id: `e-${sourceId}-${targetId}`,
        type: 'uml',
        source: sourceId,
        target: targetId,
        label: label || undefined,
        data: {
          edgeType: 'association' as UmlEdgeType,
          lineStyle: 'solid' as const,
        },
      })
      continue
    }

    // Standalone node definitions (no edge on this line)
    // Diamond: A{label}
    const diamondMatch = line.match(/^(\w+)\{([^}]+)\}$/)
    if (diamondMatch) {
      const [, id, label] = diamondMatch
      setFlowNode(nodes, id, label, 'diamond')
      continue
    }

    // Circle: A((label))
    const circleMatch = line.match(/^(\w+)\(\(([^)]+)\)\)$/)
    if (circleMatch) {
      const [, id, label] = circleMatch
      setFlowNode(nodes, id, label, 'circle')
      continue
    }

    // Rounded: A(label)
    const roundedMatch = line.match(/^(\w+)\(([^)]+)\)$/)
    if (roundedMatch) {
      const [, id, label] = roundedMatch
      setFlowNode(nodes, id, label, 'rounded')
      continue
    }

    // Rectangle: A[label]
    const rectMatch = line.match(/^(\w+)\[([^\]]+)\]$/)
    if (rectMatch) {
      const [, id, label] = rectMatch
      setFlowNode(nodes, id, label, 'rectangle')
      continue
    }
  }

  // Auto-layout for flowchart nodes
  const nodeList = Array.from(nodes.values())
  const cols = Math.max(2, Math.ceil(Math.sqrt(nodeList.length)))

  nodeList.forEach((node, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    node.position = { x: 50 + col * 200, y: 50 + row * 150 }
  })

  return { nodes: nodeList, edges }
}

function ensureFlowNode(nodes: Map<string, DiagramNode>, id: string) {
  if (!nodes.has(id)) {
    const data: ProcessNodeData = { label: id, shape: 'rectangle' }
    nodes.set(id, {
      id,
      type: 'process',
      position: { x: 0, y: 0 },
      data: data as unknown as Record<string, unknown>,
    })
  }
}

function setFlowNode(
  nodes: Map<string, DiagramNode>,
  id: string,
  label: string,
  shape: ProcessNodeData['shape'],
) {
  const data: ProcessNodeData = { label, shape }
  nodes.set(id, {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: data as unknown as Record<string, unknown>,
  })
}

// ---------- Activity Diagram Parsing ----------

interface SubgraphDef {
  id: string
  label: string
  nodeIds: string[]
}

function parseActivity(code: string): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const lines = code.split('\n').map((l) => l.trim()).filter(Boolean)
  const nodes = new Map<string, DiagramNode>()
  const edges: DiagramEdge[] = []
  const subgraphs: SubgraphDef[] = []
  let currentSubgraph: SubgraphDef | null = null

  for (const line of lines) {
    // Skip header
    if (line.startsWith('flowchart') || line.startsWith('graph')) continue

    // Subgraph start: subgraph ID["Label"] or subgraph ID
    const subMatch = line.match(/^subgraph\s+(\w+)(?:\["([^"]+)"\])?$/)
    if (subMatch) {
      const [, id, label] = subMatch
      currentSubgraph = { id, label: label || id, nodeIds: [] }
      subgraphs.push(currentSubgraph)
      continue
    }

    // Subgraph end
    if (line === 'end') {
      currentSubgraph = null
      continue
    }

    // Edge with optional label: A -->|label| B or A --> B
    const edgeMatch = line.match(
      /^(\w+)\s+-->(?:\|([^|]*)\|)?\s+(\w+)$/,
    )
    if (edgeMatch) {
      const [, source, label, target] = edgeMatch
      ensureActivityNode(nodes, source)
      ensureActivityNode(nodes, target)
      if (currentSubgraph) {
        if (!currentSubgraph.nodeIds.includes(source)) currentSubgraph.nodeIds.push(source)
        if (!currentSubgraph.nodeIds.includes(target)) currentSubgraph.nodeIds.push(target)
      }
      edges.push({
        id: `e-${source}-${target}`,
        type: 'uml',
        source,
        target,
        label: label || undefined,
        data: {
          edgeType: 'association' as UmlEdgeType,
          lineStyle: 'solid' as const,
        },
      })
      continue
    }

    // Node definitions - check for activity-specific types

    // Circle node (start/end): A((label))
    const circleMatch = line.match(/^(\w+)\(\(([^)]+)\)\)$/)
    if (circleMatch) {
      const [, id, label] = circleMatch
      const isStart = label.toLowerCase().includes('start') || label === '\u25CF'
      const isEnd = label.toLowerCase().includes('end') || label === '\u25C9'
      if (isStart) {
        nodes.set(id, {
          id,
          type: 'start',
          position: { x: 0, y: 0 },
          data: {},
        })
      } else if (isEnd) {
        nodes.set(id, {
          id,
          type: 'end',
          position: { x: 0, y: 0 },
          data: {},
        })
      } else {
        // Treat as a regular activity with rounded shape
        const data: ActivityNodeData = { label }
        nodes.set(id, {
          id,
          type: 'activity',
          position: { x: 0, y: 0 },
          data: data as unknown as Record<string, unknown>,
        })
      }
      if (currentSubgraph && !currentSubgraph.nodeIds.includes(id)) {
        currentSubgraph.nodeIds.push(id)
      }
      continue
    }

    // Diamond: A{label}
    const diamondMatch = line.match(/^(\w+)\{([^}]+)\}$/)
    if (diamondMatch) {
      const [, id, label] = diamondMatch
      const data: ProcessNodeData = { label, shape: 'diamond' }
      nodes.set(id, {
        id,
        type: 'process',
        position: { x: 0, y: 0 },
        data: data as unknown as Record<string, unknown>,
      })
      if (currentSubgraph && !currentSubgraph.nodeIds.includes(id)) {
        currentSubgraph.nodeIds.push(id)
      }
      continue
    }

    // Rounded rect (activity): A(label)
    const roundedMatch = line.match(/^(\w+)\(([^)]+)\)$/)
    if (roundedMatch) {
      const [, id, label] = roundedMatch
      const data: ActivityNodeData = { label }
      nodes.set(id, {
        id,
        type: 'activity',
        position: { x: 0, y: 0 },
        data: data as unknown as Record<string, unknown>,
      })
      if (currentSubgraph && !currentSubgraph.nodeIds.includes(id)) {
        currentSubgraph.nodeIds.push(id)
      }
      continue
    }

    // Rectangle: A[label] - for fork/join or plain
    const rectMatch = line.match(/^(\w+)\[([^\]]*)\]$/)
    if (rectMatch) {
      const [, id, label] = rectMatch
      if (label.trim() === '' || label.trim() === ' ') {
        // Empty label = fork/join bar
        nodes.set(id, {
          id,
          type: 'forkJoin',
          position: { x: 0, y: 0 },
          data: {},
        })
      } else {
        const data: ActivityNodeData = { label }
        nodes.set(id, {
          id,
          type: 'activity',
          position: { x: 0, y: 0 },
          data: data as unknown as Record<string, unknown>,
        })
      }
      if (currentSubgraph && !currentSubgraph.nodeIds.includes(id)) {
        currentSubgraph.nodeIds.push(id)
      }
      continue
    }
  }

  // Create swimlane nodes from subgraphs and lay out nodes within them
  const LANE_WIDTH = 250
  const LANE_PADDING_TOP = 50
  const LANE_SPACING = 30
  const NODE_SPACING_Y = 80

  const allNodes: DiagramNode[] = []

  // Track which nodes are placed in swimlanes
  const placedNodeIds = new Set<string>()

  subgraphs.forEach((sg, laneIdx) => {
    const laneX = 50 + laneIdx * (LANE_WIDTH + LANE_SPACING)
    const laneY = 50

    // Position nodes within this lane
    sg.nodeIds.forEach((nodeId, nodeIdx) => {
      const node = nodes.get(nodeId)
      if (node) {
        node.position = {
          x: laneX + LANE_WIDTH / 2 - 60,
          y: laneY + LANE_PADDING_TOP + nodeIdx * NODE_SPACING_Y,
        }
        allNodes.push(node)
        placedNodeIds.add(nodeId)
      }
    })

    // Create the swimlane background node
    const laneHeight = Math.max(
      400,
      LANE_PADDING_TOP + sg.nodeIds.length * NODE_SPACING_Y + 60,
    )
    const laneData: SwimlaneNodeData = {
      label: sg.label,
      width: LANE_WIDTH,
      height: laneHeight,
    }
    allNodes.push({
      id: `lane_${sg.id}`,
      type: 'swimlane',
      position: { x: laneX, y: laneY },
      data: laneData as unknown as Record<string, unknown>,
    })
  })

  // Add any ungrouped nodes
  let ungroupedIdx = 0
  for (const [id, node] of nodes) {
    if (!placedNodeIds.has(id)) {
      const offsetX = subgraphs.length * (LANE_WIDTH + LANE_SPACING) + 50
      node.position = {
        x: offsetX,
        y: 50 + ungroupedIdx * NODE_SPACING_Y,
      }
      allNodes.push(node)
      ungroupedIdx++
    }
  }

  // Sort so swimlanes are first (lower z-index effect through render order)
  allNodes.sort((a, b) => {
    if (a.type === 'swimlane' && b.type !== 'swimlane') return -1
    if (a.type !== 'swimlane' && b.type === 'swimlane') return 1
    return 0
  })

  return { nodes: allNodes, edges }
}

function ensureActivityNode(nodes: Map<string, DiagramNode>, id: string) {
  if (!nodes.has(id)) {
    const data: ActivityNodeData = { label: id }
    nodes.set(id, {
      id,
      type: 'activity',
      position: { x: 0, y: 0 },
      data: data as unknown as Record<string, unknown>,
    })
  }
}
