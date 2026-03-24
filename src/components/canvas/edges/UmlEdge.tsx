'use client'

import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react'
import type { UmlEdgeData } from '@/lib/types/uml'

type UmlEdgeType = Edge<UmlEdgeData, 'uml'>

/**
 * SVG marker definitions for UML relationship types.
 * These are rendered once in a hidden SVG and referenced by marker-end/marker-start.
 */
export function UmlEdgeMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* Open arrow - for association, dependency */}
        <marker
          id="uml-arrow-open"
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="10"
          markerHeight="10"
          orient="auto-start-reverse"
        >
          <path d="M2 2 L10 6 L2 10" fill="none" stroke="#71717a" strokeWidth="1.5" />
        </marker>

        {/* Hollow triangle - for inheritance, implementation */}
        <marker
          id="uml-arrow-triangle"
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="10"
          markerHeight="10"
          orient="auto-start-reverse"
        >
          <path d="M2 2 L10 6 L2 10 Z" fill="#1a1a22" stroke="#71717a" strokeWidth="1.5" />
        </marker>

        {/* Hollow diamond - for aggregation */}
        <marker
          id="uml-diamond-hollow"
          viewBox="0 0 16 12"
          refX="1"
          refY="6"
          markerWidth="12"
          markerHeight="10"
          orient="auto-start-reverse"
        >
          <path d="M1 6 L8 2 L15 6 L8 10 Z" fill="#1a1a22" stroke="#71717a" strokeWidth="1.5" />
        </marker>

        {/* Filled diamond - for composition */}
        <marker
          id="uml-diamond-filled"
          viewBox="0 0 16 12"
          refX="1"
          refY="6"
          markerWidth="12"
          markerHeight="10"
          orient="auto-start-reverse"
        >
          <path d="M1 6 L8 2 L15 6 L8 10 Z" fill="#71717a" stroke="#71717a" strokeWidth="1.5" />
        </marker>
      </defs>
    </svg>
  )
}

function getMarkerEnd(edgeType: UmlEdgeData['edgeType']): string | undefined {
  switch (edgeType) {
    case 'association':
    case 'dependency':
    case 'sequence-message':
      return 'url(#uml-arrow-open)'
    case 'inheritance':
    case 'implementation':
      return 'url(#uml-arrow-triangle)'
    default:
      return undefined
  }
}

function getMarkerStart(edgeType: UmlEdgeData['edgeType']): string | undefined {
  switch (edgeType) {
    case 'aggregation':
      return 'url(#uml-diamond-hollow)'
    case 'composition':
      return 'url(#uml-diamond-filled)'
    default:
      return undefined
  }
}

function getStrokeDasharray(edgeType: UmlEdgeData['edgeType']): string | undefined {
  switch (edgeType) {
    case 'implementation':
    case 'dependency':
      return '6 4'
    default:
      return undefined
  }
}

function UmlEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  selected,
}: EdgeProps<UmlEdgeType>) {
  const edgeType = data?.edgeType ?? 'association'

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const strokeColor = selected ? '#6366f1' : '#71717a'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: getStrokeDasharray(edgeType),
        }}
        markerEnd={getMarkerEnd(edgeType)}
        markerStart={getMarkerStart(edgeType)}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute bg-surface px-1.5 py-0.5 rounded text-[10px] text-muted border border-border/50 pointer-events-all nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const UmlEdge = memo(UmlEdgeComponent)
