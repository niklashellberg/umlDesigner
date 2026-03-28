import { ClassNode } from './ClassNode'
import { InterfaceNode } from './InterfaceNode'
import { ProcessNode } from './ProcessNode'
import { StartNode } from './StartNode'
import { EndNode } from './EndNode'
import { ActivityNode } from './ActivityNode'
import { ForkJoinNode } from './ForkJoinNode'
import { SwimlaneNode } from './SwimlaneNode'
import { StateNode } from './StateNode'
import { EntityNode } from './EntityNode'

export const nodeTypes = {
  class: ClassNode,
  interface: InterfaceNode,
  process: ProcessNode,
  start: StartNode,
  end: EndNode,
  activity: ActivityNode,
  forkJoin: ForkJoinNode,
  swimlane: SwimlaneNode,
  state: StateNode,
  entity: EntityNode,
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
  StateNode,
  EntityNode,
}
