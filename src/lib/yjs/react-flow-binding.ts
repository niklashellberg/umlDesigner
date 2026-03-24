'use client'

/**
 * Bidirectional binding between Yjs shared types and React Flow state.
 *
 * Remote changes (Y.Map observer) → call React Flow setter
 * Local changes (React Flow callbacks) → write to Y.Map
 *
 * The binding avoids echo loops by tracking whether an update originated
 * locally or remotely via a simple flag.
 */

import { useEffect, useRef } from 'react'
import * as Y from 'yjs'
import type { DiagramNode, DiagramEdge } from '@/lib/types/diagram'

// ----------------------------------------------------------------------------
// Hook: sync Y.Map<DiagramNode> ↔ React Flow nodes
// ----------------------------------------------------------------------------

export function useYNodesBinding(
  yNodes: Y.Map<DiagramNode> | null,
  /** React Flow's setNodes dispatcher */
  setNodes: (updater: (prev: DiagramNode[]) => DiagramNode[]) => void,
): {
  writeNodeToYjs: (node: DiagramNode) => void
  deleteNodeFromYjs: (id: string) => void
} {
  // True while we are applying a remote Yjs update so we don't echo it back
  const applyingRemote = useRef(false)

  useEffect(() => {
    if (!yNodes) return

    const observer = () => {
      applyingRemote.current = true
      const nodes: DiagramNode[] = []
      yNodes.forEach((node) => nodes.push(node))
      setNodes(() => nodes)
      applyingRemote.current = false
    }

    yNodes.observe(observer)
    // Immediately apply current state
    observer()

    return () => {
      yNodes.unobserve(observer)
    }
  }, [yNodes, setNodes])

  const writeNodeToYjs = (node: DiagramNode) => {
    if (!yNodes || applyingRemote.current) return
    yNodes.set(node.id, node)
  }

  const deleteNodeFromYjs = (id: string) => {
    if (!yNodes || applyingRemote.current) return
    yNodes.delete(id)
  }

  return { writeNodeToYjs, deleteNodeFromYjs }
}

// ----------------------------------------------------------------------------
// Hook: sync Y.Map<DiagramEdge> ↔ React Flow edges
// ----------------------------------------------------------------------------

export function useYEdgesBinding(
  yEdges: Y.Map<DiagramEdge> | null,
  /** React Flow's setEdges dispatcher */
  setEdges: (updater: (prev: DiagramEdge[]) => DiagramEdge[]) => void,
): {
  writeEdgeToYjs: (edge: DiagramEdge) => void
  deleteEdgeFromYjs: (id: string) => void
} {
  const applyingRemote = useRef(false)

  useEffect(() => {
    if (!yEdges) return

    const observer = () => {
      applyingRemote.current = true
      const edges: DiagramEdge[] = []
      yEdges.forEach((edge) => edges.push(edge))
      setEdges(() => edges)
      applyingRemote.current = false
    }

    yEdges.observe(observer)
    observer()

    return () => {
      yEdges.unobserve(observer)
    }
  }, [yEdges, setEdges])

  const writeEdgeToYjs = (edge: DiagramEdge) => {
    if (!yEdges || applyingRemote.current) return
    yEdges.set(edge.id, edge)
  }

  const deleteEdgeFromYjs = (id: string) => {
    if (!yEdges || applyingRemote.current) return
    yEdges.delete(id)
  }

  return { writeEdgeToYjs, deleteEdgeFromYjs }
}

// ----------------------------------------------------------------------------
// Utility: write an entire nodes array to Y.Map (replaces previous state)
// ----------------------------------------------------------------------------

export function syncNodesToYjs(
  nodes: DiagramNode[],
  yNodes: Y.Map<DiagramNode>,
): void {
  const doc = yNodes.doc
  if (!doc) return
  doc.transact(() => {
    // Remove nodes that no longer exist
    const incomingIds = new Set(nodes.map((n) => n.id))
    yNodes.forEach((_, id) => {
      if (!incomingIds.has(id)) yNodes.delete(id)
    })
    // Upsert all current nodes
    for (const node of nodes) {
      yNodes.set(node.id, node)
    }
  })
}

export function syncEdgesToYjs(
  edges: DiagramEdge[],
  yEdges: Y.Map<DiagramEdge>,
): void {
  const doc = yEdges.doc
  if (!doc) return
  doc.transact(() => {
    const incomingIds = new Set(edges.map((e) => e.id))
    yEdges.forEach((_, id) => {
      if (!incomingIds.has(id)) yEdges.delete(id)
    })
    for (const edge of edges) {
      yEdges.set(edge.id, edge)
    }
  })
}
