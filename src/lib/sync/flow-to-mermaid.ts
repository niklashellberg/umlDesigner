import type { DiagramNode, DiagramEdge, DiagramType } from '@/lib/types/diagram'
import type { ClassNodeData, InterfaceNodeData, ProcessNodeData, ActivityNodeData, SwimlaneNodeData, UmlEdgeData } from '@/lib/types/uml'

/**
 * Converts React Flow nodes and edges into Mermaid diagram syntax.
 * Supports class diagrams and flowcharts.
 */
export function flowToMermaid(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  diagramType: DiagramType,
): string {
  switch (diagramType) {
    case 'class':
      return classToMermaid(nodes, edges)
    case 'flowchart':
      return flowchartToMermaid(nodes, edges)
    case 'activity':
      return activityToMermaid(nodes, edges)
    default:
      return ''
  }
}

function classToMermaid(nodes: DiagramNode[], edges: DiagramEdge[]): string {
  const lines: string[] = ['classDiagram']

  for (const node of nodes) {
    if (node.type === 'class') {
      const data = node.data as unknown as ClassNodeData
      const name = sanitizeId(data.label)

      if (data.stereotype) {
        lines.push(`  <<${data.stereotype}>> ${name}`)
      }

      lines.push(`  class ${name} {`)

      for (const field of data.fields) {
        lines.push(`    ${field}`)
      }

      for (const method of data.methods) {
        lines.push(`    ${method}`)
      }

      lines.push('  }')
    }

    if (node.type === 'interface') {
      const data = node.data as unknown as InterfaceNodeData
      const name = sanitizeId(data.label)

      lines.push(`  <<interface>> ${name}`)
      lines.push(`  class ${name} {`)

      for (const method of data.methods) {
        lines.push(`    ${method}`)
      }

      lines.push('  }')
    }
  }

  for (const edge of edges) {
    const sourceNode = nodes.find((n) => n.id === edge.source)
    const targetNode = nodes.find((n) => n.id === edge.target)
    if (!sourceNode || !targetNode) continue

    const sourceData = sourceNode.data as unknown as ClassNodeData | InterfaceNodeData
    const targetData = targetNode.data as unknown as ClassNodeData | InterfaceNodeData
    const sourceName = sanitizeId(sourceData.label)
    const targetName = sanitizeId(targetData.label)

    const edgeData = edge.data as unknown as UmlEdgeData | undefined
    const edgeType = edgeData?.edgeType ?? 'association'

    const arrow = mermaidClassArrow(edgeType)
    const labelStr = edge.label ? ` : ${edge.label}` : ''

    lines.push(`  ${sourceName} ${arrow} ${targetName}${labelStr}`)
  }

  return lines.join('\n')
}

function mermaidClassArrow(edgeType: string): string {
  switch (edgeType) {
    case 'inheritance':
      return '<|--'
    case 'implementation':
      return '<|..'
    case 'dependency':
      return '<..'
    case 'aggregation':
      return 'o--'
    case 'composition':
      return '*--'
    case 'association':
    default:
      return '-->'
  }
}

function flowchartToMermaid(nodes: DiagramNode[], edges: DiagramEdge[]): string {
  const lines: string[] = ['flowchart TD']

  for (const node of nodes) {
    if (node.type !== 'process') continue
    const data = node.data as unknown as ProcessNodeData
    const id = sanitizeId(node.id)
    const label = data.label

    switch (data.shape) {
      case 'diamond':
        lines.push(`  ${id}{${label}}`)
        break
      case 'rounded':
        lines.push(`  ${id}(${label})`)
        break
      case 'circle':
        lines.push(`  ${id}((${label}))`)
        break
      case 'rectangle':
      default:
        lines.push(`  ${id}[${label}]`)
        break
    }
  }

  for (const edge of edges) {
    const sourceId = sanitizeId(edge.source)
    const targetId = sanitizeId(edge.target)
    const labelStr = edge.label ? `|${edge.label}|` : ''

    lines.push(`  ${sourceId} -->${labelStr} ${targetId}`)
  }

  return lines.join('\n')
}

function activityToMermaid(nodes: DiagramNode[], edges: DiagramEdge[]): string {
  const lines: string[] = ['flowchart TD']

  // Separate swimlanes from other nodes
  const swimlanes = nodes.filter((n) => n.type === 'swimlane')
  const otherNodes = nodes.filter((n) => n.type !== 'swimlane')

  // Determine which swimlane each node belongs to by checking position bounds
  function findSwimlane(node: DiagramNode): DiagramNode | null {
    for (const lane of swimlanes) {
      const laneData = lane.data as unknown as SwimlaneNodeData
      const laneW = laneData.width || 250
      const laneH = laneData.height || 500
      const lx = lane.position.x
      const ly = lane.position.y
      const nx = node.position.x
      const ny = node.position.y

      if (nx >= lx && nx <= lx + laneW && ny >= ly && ny <= ly + laneH) {
        return lane
      }
    }
    return null
  }

  // Group nodes by swimlane
  const laneGroups = new Map<string, DiagramNode[]>()
  const ungrouped: DiagramNode[] = []

  for (const node of otherNodes) {
    const lane = findSwimlane(node)
    if (lane) {
      const laneData = lane.data as unknown as SwimlaneNodeData
      const key = sanitizeId(laneData.label || lane.id)
      if (!laneGroups.has(key)) {
        laneGroups.set(key, [])
      }
      laneGroups.get(key)!.push(node)
    } else {
      ungrouped.push(node)
    }
  }

  // Emit subgraphs for each swimlane
  for (const lane of swimlanes) {
    const laneData = lane.data as unknown as SwimlaneNodeData
    const key = sanitizeId(laneData.label || lane.id)
    const label = laneData.label || 'Lane'
    const groupNodes = laneGroups.get(key) || []

    lines.push(`  subgraph ${key}["${label}"]`)
    for (const node of groupNodes) {
      lines.push(`    ${activityNodeToMermaid(node)}`)
    }
    lines.push('  end')
  }

  // Emit ungrouped nodes
  for (const node of ungrouped) {
    lines.push(`  ${activityNodeToMermaid(node)}`)
  }

  // Emit edges
  for (const edge of edges) {
    const sourceId = sanitizeId(edge.source)
    const targetId = sanitizeId(edge.target)
    const labelStr = edge.label ? `|${edge.label}|` : ''
    lines.push(`  ${sourceId} -->${labelStr} ${targetId}`)
  }

  return lines.join('\n')
}

function activityNodeToMermaid(node: DiagramNode): string {
  const id = sanitizeId(node.id)

  switch (node.type) {
    case 'start':
      return `${id}((start))`
    case 'end':
      return `${id}((end))`
    case 'activity': {
      const data = node.data as unknown as ActivityNodeData
      return `${id}(${data.label || 'Activity'})`
    }
    case 'process': {
      const data = node.data as unknown as ProcessNodeData
      if (data.shape === 'diamond') {
        return `${id}{${data.label}}`
      }
      return `${id}[${data.label}]`
    }
    case 'forkJoin':
      return `${id}[" "]`
    default:
      return `${id}[${node.type}]`
  }
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '')
}
