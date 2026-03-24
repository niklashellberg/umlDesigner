import type { DiagramNode, DiagramEdge, DiagramType } from '@/lib/types/diagram'
import type { ClassNodeData, ProcessNodeData, UmlEdgeType } from '@/lib/types/uml'

/**
 * Parses Mermaid diagram code into React Flow nodes and edges.
 * Uses regex-based parsing for the supported Mermaid subset.
 */
export function mermaidToFlow(
  code: string,
  diagramType: DiagramType,
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const trimmed = code.trim()

  if (diagramType === 'class' || trimmed.startsWith('classDiagram')) {
    return parseClassDiagram(trimmed)
  }

  if (diagramType === 'flowchart' || trimmed.startsWith('flowchart')) {
    return parseFlowchart(trimmed)
  }

  return { nodes: [], edges: [] }
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

    // Edge with optional label: A -->|label| B or A --> B
    const edgeMatch = line.match(
      /^(\w+)\s+-->(?:\|([^|]*)\|)?\s+(\w+)$/,
    )
    if (edgeMatch) {
      const [, source, label, target] = edgeMatch
      ensureFlowNode(nodes, source)
      ensureFlowNode(nodes, target)
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

    // Node definitions
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
