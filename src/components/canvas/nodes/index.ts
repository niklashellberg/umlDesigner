import { ClassNode } from './ClassNode'
import { InterfaceNode } from './InterfaceNode'
import { ProcessNode } from './ProcessNode'

export const nodeTypes = {
  class: ClassNode,
  interface: InterfaceNode,
  process: ProcessNode,
} as const

export { ClassNode, InterfaceNode, ProcessNode }
