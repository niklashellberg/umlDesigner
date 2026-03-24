export interface ClassNodeData {
  [key: string]: unknown
  label: string
  stereotype?: string
  fields: string[]
  methods: string[]
}

export interface InterfaceNodeData {
  [key: string]: unknown
  label: string
  methods: string[]
}

export interface ActorNodeData {
  [key: string]: unknown
  label: string
}

export interface LifelineNodeData {
  [key: string]: unknown
  label: string
}

export interface ProcessNodeData {
  [key: string]: unknown
  label: string
  shape: 'rectangle' | 'rounded' | 'diamond' | 'circle'
}

export type UmlEdgeType =
  | 'association'
  | 'inheritance'
  | 'implementation'
  | 'dependency'
  | 'aggregation'
  | 'composition'
  | 'sequence-message'

export interface UmlEdgeData {
  [key: string]: unknown
  edgeType: UmlEdgeType
  cardinality?: { source: string; target: string }
  lineStyle: 'solid' | 'dashed'
  messageType?: 'sync' | 'async' | 'return'
}
