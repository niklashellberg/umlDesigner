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

export interface ActivityNodeData {
  [key: string]: unknown
  label: string
}

export interface SwimlaneNodeData {
  [key: string]: unknown
  label: string
  width: number
  height: number
}

export interface StartNodeData {
  [key: string]: unknown
}

export interface EndNodeData {
  [key: string]: unknown
}

export interface ForkJoinNodeData {
  [key: string]: unknown
}

export interface StateNodeData {
  [key: string]: unknown
  label: string
  isInitial?: boolean
  isFinal?: boolean
}

export interface EntityNodeData {
  [key: string]: unknown
  label: string
  attributes: string[]
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
