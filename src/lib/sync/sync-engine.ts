import type { DiagramNode, DiagramEdge, DiagramType } from '@/lib/types/diagram'
import { flowToMermaid } from './flow-to-mermaid'
import { mermaidToFlow } from './mermaid-to-flow'

/**
 * Converts React Flow nodes/edges to Mermaid code string.
 * Used when syncing visual canvas changes back to the code editor.
 */
export function syncToCode(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  diagramType: DiagramType,
): string {
  return flowToMermaid(nodes, edges, diagramType)
}

/**
 * Parses Mermaid code into React Flow nodes/edges.
 * Used when switching from code editor to visual canvas.
 *
 * Pass `existingPositions` to preserve manual node placement across syncs.
 */
export function syncFromCode(
  code: string,
  diagramType: DiagramType,
  existingPositions?: Map<string, { x: number; y: number }>,
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  return mermaidToFlow(code, diagramType, existingPositions)
}
