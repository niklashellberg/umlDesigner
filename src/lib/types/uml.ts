export interface ClassNodeData {
  label: string
  stereotype?: string
  fields: string[]
  methods: string[]
}

export interface InterfaceNodeData {
  label: string
  methods: string[]
}

export interface ActorNodeData {
  label: string
}

export interface LifelineNodeData {
  label: string
}

export interface ProcessNodeData {
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
  edgeType: UmlEdgeType
  cardinality?: { source: string; target: string }
  lineStyle: 'solid' | 'dashed'
  messageType?: 'sync' | 'async' | 'return'
}
