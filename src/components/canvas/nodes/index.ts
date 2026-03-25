import { ClassNode } from './ClassNode'
import { InterfaceNode } from './InterfaceNode'
import { ProcessNode } from './ProcessNode'
import { StartNode } from './StartNode'
import { EndNode } from './EndNode'
import { ActivityNode } from './ActivityNode'
import { ForkJoinNode } from './ForkJoinNode'
import { SwimlaneNode } from './SwimlaneNode'

export const nodeTypes = {
  class: ClassNode,
  interface: InterfaceNode,
  process: ProcessNode,
  start: StartNode,
  end: EndNode,
  activity: ActivityNode,
  forkJoin: ForkJoinNode,
  swimlane: SwimlaneNode,
} as const

export {
  ClassNode,
  InterfaceNode,
  ProcessNode,
  StartNode,
  EndNode,
  ActivityNode,
  ForkJoinNode,
  SwimlaneNode,
}
