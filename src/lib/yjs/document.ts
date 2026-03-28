/**
 * Defines the shared Yjs document structure for a diagram.
 *
 * Layout of a Y.Doc:
 *   meta  : Y.Map  – diagram metadata (id, title, type, timestamps)
 *   nodes : Y.Map  – React Flow nodes keyed by node ID
 *   edges : Y.Map  – React Flow edges keyed by edge ID
 *   code  : Y.Text – Mermaid source text
 *
 * Using Y.Map for nodes/edges gives us per-entry CRDTs so concurrent edits
 * to different nodes merge cleanly without last-write-wins conflicts on the
 * whole array.
 */

import * as Y from 'yjs'
import type { DiagramMeta, DiagramNode, DiagramEdge } from '@/lib/types/diagram'

// ----------------------------------------------------------------------------
// Typed accessor helpers
// ----------------------------------------------------------------------------

export function getSharedMeta(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap('meta')
}

export function getSharedNodes(doc: Y.Doc): Y.Map<DiagramNode> {
  return doc.getMap<DiagramNode>('nodes')
}

export function getSharedEdges(doc: Y.Doc): Y.Map<DiagramEdge> {
  return doc.getMap<DiagramEdge>('edges')
}

export function getSharedCode(doc: Y.Doc): Y.Text {
  return doc.getText('code')
}

export function getSharedMarkdown(doc: Y.Doc): Y.Text {
  return doc.getText('markdown')
}

// ----------------------------------------------------------------------------
// Conversion: Y.Map → plain arrays expected by React Flow / Zustand
// ----------------------------------------------------------------------------

export function yNodesToArray(yNodes: Y.Map<DiagramNode>): DiagramNode[] {
  const result: DiagramNode[] = []
  yNodes.forEach((node) => {
    result.push(node)
  })
  return result
}

export function yEdgesToArray(yEdges: Y.Map<DiagramEdge>): DiagramEdge[] {
  const result: DiagramEdge[] = []
  yEdges.forEach((edge) => {
    result.push(edge)
  })
  return result
}

// ----------------------------------------------------------------------------
// Conversion: plain arrays → Y.Map (used for initial population)
// ----------------------------------------------------------------------------

export function arrayToYNodes(
  nodes: DiagramNode[],
  yNodes: Y.Map<DiagramNode>,
): void {
  for (const node of nodes) {
    yNodes.set(node.id, node)
  }
}

export function arrayToYEdges(
  edges: DiagramEdge[],
  yEdges: Y.Map<DiagramEdge>,
): void {
  for (const edge of edges) {
    yEdges.set(edge.id, edge)
  }
}

// ----------------------------------------------------------------------------
// Seed a fresh doc from a Diagram snapshot (only if doc is empty)
// ----------------------------------------------------------------------------

export function seedDocFromDiagram(
  doc: Y.Doc,
  meta: DiagramMeta,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  code: string,
  markdown?: string,
): void {
  doc.transact(() => {
    const yMeta = getSharedMeta(doc)
    // Only seed if meta is empty (i.e. doc is brand new – server may have
    // already populated it from persistence)
    if (yMeta.size === 0) {
      yMeta.set('id', meta.id)
      yMeta.set('title', meta.title)
      yMeta.set('type', meta.type)
      yMeta.set('createdAt', meta.createdAt)
      yMeta.set('updatedAt', meta.updatedAt)

      arrayToYNodes(nodes, getSharedNodes(doc))
      arrayToYEdges(edges, getSharedEdges(doc))

      const yCode = getSharedCode(doc)
      if (yCode.length === 0 && code.length > 0) {
        yCode.insert(0, code)
      }

      if (markdown) {
        const yMarkdown = getSharedMarkdown(doc)
        if (yMarkdown.length === 0 && markdown.length > 0) {
          yMarkdown.insert(0, markdown)
        }
      }
    }
  })
}
