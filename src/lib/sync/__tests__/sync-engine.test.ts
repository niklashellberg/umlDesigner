import { describe, it, expect } from 'vitest'
import { mermaidToFlow } from '@/lib/sync/mermaid-to-flow'
import { flowToMermaid } from '@/lib/sync/flow-to-mermaid'
import { syncToCode, syncFromCode } from '@/lib/sync/sync-engine'
import type { DiagramNode, DiagramEdge } from '@/lib/types/diagram'
import type { ClassNodeData, ProcessNodeData, ActivityNodeData, UmlEdgeData } from '@/lib/types/uml'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Type-safe accessor for node data */
function classData(node: DiagramNode): ClassNodeData {
  return node.data as unknown as ClassNodeData
}

function processData(node: DiagramNode): ProcessNodeData {
  return node.data as unknown as ProcessNodeData
}

function activityData(node: DiagramNode): ActivityNodeData {
  return node.data as unknown as ActivityNodeData
}

function edgeData(edge: DiagramEdge): UmlEdgeData {
  return edge.data as unknown as UmlEdgeData
}

// ---------------------------------------------------------------------------
// Group 1: mermaidToFlow - Class Diagrams
// ---------------------------------------------------------------------------

describe('mermaidToFlow - Class Diagrams', () => {
  it('parses empty classDiagram to 0 nodes and 0 edges', () => {
    const result = mermaidToFlow('classDiagram', 'class')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('parses a single class with fields and methods', () => {
    const code = `classDiagram
class Animal {
  +String name
  +int age
  +eat()
  +sleep()
}`
    const result = mermaidToFlow(code, 'class')
    expect(result.nodes).toHaveLength(1)
    expect(result.edges).toHaveLength(0)

    const node = result.nodes[0]
    expect(node.id).toBe('Animal')
    expect(node.type).toBe('class')

    const data = classData(node)
    expect(data.label).toBe('Animal')
    expect(data.fields).toEqual(['+String name', '+int age'])
    expect(data.methods).toEqual(['+eat()', '+sleep()'])
  })

  it('parses class with <<interface>> stereotype', () => {
    const code = `classDiagram
<<interface>> Flyable
class Flyable {
  +fly()
}`
    const result = mermaidToFlow(code, 'class')
    expect(result.nodes).toHaveLength(1)

    const node = result.nodes[0]
    // When stereotype is 'interface', the parser sets type to 'interface'
    expect(node.type).toBe('interface')
    expect(classData(node).stereotype).toBe('interface')
  })

  it('parses class with <<abstract>> stereotype', () => {
    const code = `classDiagram
<<abstract>> Shape
class Shape {
  +draw()
}`
    const result = mermaidToFlow(code, 'class')
    expect(result.nodes).toHaveLength(1)

    const node = result.nodes[0]
    // abstract is not 'interface', so type stays 'class'
    expect(node.type).toBe('class')
    expect(classData(node).stereotype).toBe('abstract')
  })

  it('parses 3 classes with inheritance edges', () => {
    const code = `classDiagram
class Animal {
  +String name
}
class Dog {
  +bark()
}
class Cat {
  +meow()
}
Animal <|-- Dog
Animal <|-- Cat`

    const result = mermaidToFlow(code, 'class')
    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toHaveLength(2)

    const dogEdge = result.edges.find((e) => e.target === 'Dog')
    expect(dogEdge).toBeDefined()
    expect(dogEdge!.source).toBe('Animal')
    expect(edgeData(dogEdge!).edgeType).toBe('inheritance')

    const catEdge = result.edges.find((e) => e.target === 'Cat')
    expect(catEdge).toBeDefined()
    expect(catEdge!.source).toBe('Animal')
    expect(edgeData(catEdge!).edgeType).toBe('inheritance')
  })

  it('parses association (-->) edges', () => {
    const code = `classDiagram
class A {
}
class B {
}
A --> B`
    const result = mermaidToFlow(code, 'class')
    expect(result.edges).toHaveLength(1)
    expect(edgeData(result.edges[0]).edgeType).toBe('association')
  })

  it('parses plain association (--) edges', () => {
    const code = `classDiagram
class A {
}
class B {
}
A -- B`
    const result = mermaidToFlow(code, 'class')
    expect(result.edges).toHaveLength(1)
    expect(edgeData(result.edges[0]).edgeType).toBe('association')
  })

  it('parses composition (*--) edges', () => {
    const code = `classDiagram
class A {
}
class B {
}
A *-- B`
    const result = mermaidToFlow(code, 'class')
    expect(result.edges).toHaveLength(1)
    expect(edgeData(result.edges[0]).edgeType).toBe('composition')
  })

  it('parses aggregation (o--) edges', () => {
    const code = `classDiagram
class A {
}
class B {
}
A o-- B`
    const result = mermaidToFlow(code, 'class')
    expect(result.edges).toHaveLength(1)
    expect(edgeData(result.edges[0]).edgeType).toBe('aggregation')
  })

  it('parses edge with label', () => {
    const code = `classDiagram
class A {
}
class B {
}
A --> B : uses`
    const result = mermaidToFlow(code, 'class')
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].label).toBe('uses')
  })

  it('preserves existing positions when map is provided', () => {
    const code = `classDiagram
class Foo {
}
class Bar {
}`
    const positions = new Map([
      ['Foo', { x: 100, y: 200 }],
      ['Bar', { x: 300, y: 400 }],
    ])
    const result = mermaidToFlow(code, 'class', positions)
    const foo = result.nodes.find((n) => n.id === 'Foo')!
    const bar = result.nodes.find((n) => n.id === 'Bar')!
    expect(foo.position).toEqual({ x: 100, y: 200 })
    expect(bar.position).toEqual({ x: 300, y: 400 })
  })

  it('returns empty result for unsupported diagram type with neutral code', () => {
    // Pass 'sequence' (unsupported) with code that does NOT start with a
    // known header like 'classDiagram' or 'flowchart', because the parser
    // uses content sniffing and will match on those headers regardless of
    // the diagramType parameter.
    const result = mermaidToFlow('sequenceDiagram\nA->>B: Hello', 'sequence')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  // BUG: When code starts with 'classDiagram', passing diagramType='sequence'
  // still parses as class diagram because content sniffing takes priority
  // over the diagramType parameter.
  it('should return empty when diagramType mismatches code header', () => {
    const code = 'classDiagram\nclass A {\n}'
    const result = mermaidToFlow(code, 'sequence')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('parses class with fields that contain special characters', () => {
    const code = `classDiagram
class Config {
  -Map<String, List<Integer>> data
  +getValue(key: String): Optional<String>
}`
    const result = mermaidToFlow(code, 'class')
    expect(result.nodes).toHaveLength(1)

    const data = classData(result.nodes[0])
    // The method line contains '(' so it is classified as a method
    expect(data.methods).toHaveLength(1)
    expect(data.fields).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Group 2: mermaidToFlow - Flowcharts
// ---------------------------------------------------------------------------

describe('mermaidToFlow - Flowcharts', () => {
  it('parses flowchart TD with rectangle nodes', () => {
    const code = `flowchart TD
A[Start Process]`
    const result = mermaidToFlow(code, 'flowchart')
    expect(result.nodes).toHaveLength(1)

    const node = result.nodes[0]
    expect(node.id).toBe('A')
    expect(node.type).toBe('process')

    const data = processData(node)
    expect(data.label).toBe('Start Process')
    expect(data.shape).toBe('rectangle')
  })

  it('parses diamond nodes A{Label}', () => {
    const code = `flowchart TD
A{Is Valid?}`
    const result = mermaidToFlow(code, 'flowchart')
    expect(result.nodes).toHaveLength(1)
    expect(processData(result.nodes[0]).shape).toBe('diamond')
    expect(processData(result.nodes[0]).label).toBe('Is Valid?')
  })

  it('parses circle nodes A((Label))', () => {
    const code = `flowchart TD
A((Start))`
    const result = mermaidToFlow(code, 'flowchart')
    expect(result.nodes).toHaveLength(1)
    expect(processData(result.nodes[0]).shape).toBe('circle')
    expect(processData(result.nodes[0]).label).toBe('Start')
  })

  it('parses rounded nodes A(Label)', () => {
    const code = `flowchart TD
A(Process Data)`
    const result = mermaidToFlow(code, 'flowchart')
    expect(result.nodes).toHaveLength(1)
    expect(processData(result.nodes[0]).shape).toBe('rounded')
    expect(processData(result.nodes[0]).label).toBe('Process Data')
  })

  it('parses edges A --> B with correct source/target', () => {
    const code = `flowchart TD
A[Start]
B[End]
A --> B`
    const result = mermaidToFlow(code, 'flowchart')
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].source).toBe('A')
    expect(result.edges[0].target).toBe('B')
  })

  it('parses labeled edges A -->|yes| B', () => {
    const code = `flowchart TD
A{Decision}
B[Yes Path]
A -->|yes| B`
    const result = mermaidToFlow(code, 'flowchart')
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].label).toBe('yes')
    expect(result.edges[0].source).toBe('A')
    expect(result.edges[0].target).toBe('B')
  })

  it('parses 4 nodes with 3 edges correctly', () => {
    const code = `flowchart TD
A[Start]
B{Decision}
C[Option 1]
D[Option 2]
A --> B
B -->|yes| C
B -->|no| D`
    const result = mermaidToFlow(code, 'flowchart')
    expect(result.nodes).toHaveLength(4)
    expect(result.edges).toHaveLength(3)

    // Verify specific connections
    const edgeAB = result.edges.find((e) => e.source === 'A' && e.target === 'B')
    expect(edgeAB).toBeDefined()
    expect(edgeAB!.label).toBeUndefined()

    const edgeBC = result.edges.find((e) => e.source === 'B' && e.target === 'C')
    expect(edgeBC).toBeDefined()
    expect(edgeBC!.label).toBe('yes')
  })

  it('returns 0 nodes for empty flowchart', () => {
    const code = 'flowchart TD'
    const result = mermaidToFlow(code, 'flowchart')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('creates default rectangle nodes for edge-only references', () => {
    // When a node appears only in an edge (not separately defined),
    // ensureFlowNode creates a rectangle with id as label
    const code = `flowchart TD
A --> B`
    const result = mermaidToFlow(code, 'flowchart')
    expect(result.nodes).toHaveLength(2)

    const nodeA = result.nodes.find((n) => n.id === 'A')!
    expect(processData(nodeA).shape).toBe('rectangle')
    expect(processData(nodeA).label).toBe('A')
  })
})

// ---------------------------------------------------------------------------
// Group 3: mermaidToFlow - Activity Diagrams
// ---------------------------------------------------------------------------

describe('mermaidToFlow - Activity Diagrams', () => {
  it('parses activity with start and end nodes', () => {
    const code = `flowchart TD
S((start))
E((end))
S --> E`
    const result = mermaidToFlow(code, 'activity')
    expect(result.nodes.length).toBeGreaterThanOrEqual(2)

    const startNode = result.nodes.find((n) => n.type === 'start')
    const endNode = result.nodes.find((n) => n.type === 'end')
    expect(startNode).toBeDefined()
    expect(endNode).toBeDefined()
    expect(result.edges).toHaveLength(1)
  })

  it('parses activity with swimlanes (subgraph)', () => {
    const code = `flowchart TD
subgraph Customer["Customer"]
  A(Place Order)
  B(Pay)
end
subgraph Warehouse["Warehouse"]
  C(Ship Order)
end
A --> B
B --> C`
    const result = mermaidToFlow(code, 'activity')

    // Should have swimlane nodes
    const swimlanes = result.nodes.filter((n) => n.type === 'swimlane')
    expect(swimlanes).toHaveLength(2)

    // Should have activity nodes
    const activities = result.nodes.filter((n) => n.type === 'activity')
    expect(activities).toHaveLength(3)

    expect(result.edges).toHaveLength(2)
  })

  it('parses fork/join nodes (empty-label rectangles)', () => {
    const code = `flowchart TD
S((start))
F1[ ]
A(Task A)
B(Task B)
F2[ ]
E((end))
S --> F1
F1 --> A
F1 --> B
A --> F2
B --> F2
F2 --> E`
    const result = mermaidToFlow(code, 'activity')

    const forkJoins = result.nodes.filter((n) => n.type === 'forkJoin')
    expect(forkJoins).toHaveLength(2)
    expect(result.edges).toHaveLength(6)
  })

  it('parses diamond decision nodes in activities', () => {
    const code = `flowchart TD
A(Check)
D{Approved?}
A --> D`
    const result = mermaidToFlow(code, 'activity')

    const diamond = result.nodes.find((n) => n.type === 'process')
    expect(diamond).toBeDefined()
    expect(processData(diamond!).shape).toBe('diamond')
  })

  it('sorts swimlane nodes before other nodes', () => {
    const code = `flowchart TD
subgraph Lane["Lane"]
  A(Task)
end`
    const result = mermaidToFlow(code, 'activity')

    // First node should be the swimlane
    expect(result.nodes[0].type).toBe('swimlane')
  })
})

// ---------------------------------------------------------------------------
// Group 4: flowToMermaid - Class Diagrams
// ---------------------------------------------------------------------------

describe('flowToMermaid - Class Diagrams', () => {
  it('returns header only for empty nodes array', () => {
    const result = flowToMermaid([], [], 'class')
    expect(result).toBe('classDiagram')
  })

  it('generates correct class block for single class node', () => {
    const nodes: DiagramNode[] = [
      {
        id: 'User',
        type: 'class',
        position: { x: 0, y: 0 },
        data: { label: 'User', stereotype: '', fields: [], methods: [] },
      },
    ]
    const result = flowToMermaid(nodes, [], 'class')
    expect(result).toContain('class User {')
    expect(result).toContain('}')
  })

  it('generates correct syntax for class with fields and methods', () => {
    const nodes: DiagramNode[] = [
      {
        id: 'User',
        type: 'class',
        position: { x: 0, y: 0 },
        data: {
          label: 'User',
          stereotype: '',
          fields: ['+String name', '-int age'],
          methods: ['+getName()', '+setAge(int)'],
        },
      },
    ]
    const result = flowToMermaid(nodes, [], 'class')
    expect(result).toContain('+String name')
    expect(result).toContain('-int age')
    expect(result).toContain('+getName()')
    expect(result).toContain('+setAge(int)')
  })

  it('generates stereotype annotation for class with stereotype', () => {
    const nodes: DiagramNode[] = [
      {
        id: 'Shape',
        type: 'class',
        position: { x: 0, y: 0 },
        data: {
          label: 'Shape',
          stereotype: 'abstract',
          fields: [],
          methods: ['+draw()'],
        },
      },
    ]
    const result = flowToMermaid(nodes, [], 'class')
    expect(result).toContain('<<abstract>> Shape')
  })

  it('generates interface node with <<interface>> annotation', () => {
    const nodes: DiagramNode[] = [
      {
        id: 'Serializable',
        type: 'interface',
        position: { x: 0, y: 0 },
        data: {
          label: 'Serializable',
          methods: ['+serialize()'],
        },
      },
    ]
    const result = flowToMermaid(nodes, [], 'class')
    expect(result).toContain('<<interface>> Serializable')
    expect(result).toContain('+serialize()')
  })

  it('generates inheritance edge as <|--', () => {
    const nodes: DiagramNode[] = [
      {
        id: 'Animal',
        type: 'class',
        position: { x: 0, y: 0 },
        data: { label: 'Animal', fields: [], methods: [] },
      },
      {
        id: 'Dog',
        type: 'class',
        position: { x: 0, y: 0 },
        data: { label: 'Dog', fields: [], methods: [] },
      },
    ]
    const edges: DiagramEdge[] = [
      {
        id: 'e-Animal-Dog',
        type: 'uml',
        source: 'Animal',
        target: 'Dog',
        data: { edgeType: 'inheritance', lineStyle: 'solid' },
      },
    ]
    const result = flowToMermaid(nodes, edges, 'class')
    expect(result).toContain('Animal <|-- Dog')
  })

  it('generates correct arrows for all edge types', () => {
    const makeEdge = (source: string, target: string, edgeType: string): DiagramEdge => ({
      id: `e-${source}-${target}`,
      type: 'uml',
      source,
      target,
      data: { edgeType, lineStyle: 'solid' },
    })
    const makeNode = (id: string): DiagramNode => ({
      id,
      type: 'class',
      position: { x: 0, y: 0 },
      data: { label: id, fields: [], methods: [] },
    })

    const nodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(makeNode)
    const edges = [
      makeEdge('A', 'B', 'association'),
      makeEdge('C', 'D', 'inheritance'),
      makeEdge('E', 'F', 'implementation'),
      makeEdge('G', 'H', 'aggregation'),
      makeEdge('I', 'J', 'composition'),
    ]

    const result = flowToMermaid(nodes, edges, 'class')
    expect(result).toContain('A --> B')
    expect(result).toContain('C <|-- D')
    expect(result).toContain('E <|.. F')
    expect(result).toContain('G o-- H')
    expect(result).toContain('I *-- J')
  })

  it('generates edge label when present', () => {
    const nodes: DiagramNode[] = [
      { id: 'A', type: 'class', position: { x: 0, y: 0 }, data: { label: 'A', fields: [], methods: [] } },
      { id: 'B', type: 'class', position: { x: 0, y: 0 }, data: { label: 'B', fields: [], methods: [] } },
    ]
    const edges: DiagramEdge[] = [
      {
        id: 'e-A-B',
        type: 'uml',
        source: 'A',
        target: 'B',
        label: 'creates',
        data: { edgeType: 'association', lineStyle: 'solid' },
      },
    ]
    const result = flowToMermaid(nodes, edges, 'class')
    expect(result).toContain('A --> B : creates')
  })
})

// ---------------------------------------------------------------------------
// Group 5: flowToMermaid - Flowcharts
// ---------------------------------------------------------------------------

describe('flowToMermaid - Flowcharts', () => {
  it('generates id[Label] for rectangle process nodes', () => {
    const nodes: DiagramNode[] = [
      {
        id: 'A',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Start', shape: 'rectangle' },
      },
    ]
    const result = flowToMermaid(nodes, [], 'flowchart')
    expect(result).toContain('A[Start]')
  })

  it('generates id{Label} for diamond nodes', () => {
    const nodes: DiagramNode[] = [
      {
        id: 'D',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Decision', shape: 'diamond' },
      },
    ]
    const result = flowToMermaid(nodes, [], 'flowchart')
    expect(result).toContain('D{Decision}')
  })

  it('generates id((Label)) for circle nodes', () => {
    const nodes: DiagramNode[] = [
      {
        id: 'C',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Hub', shape: 'circle' },
      },
    ]
    const result = flowToMermaid(nodes, [], 'flowchart')
    expect(result).toContain('C((Hub))')
  })

  it('generates id(Label) for rounded nodes', () => {
    const nodes: DiagramNode[] = [
      {
        id: 'R',
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label: 'Process', shape: 'rounded' },
      },
    ]
    const result = flowToMermaid(nodes, [], 'flowchart')
    expect(result).toContain('R(Process)')
  })

  it('generates source --> target for edges', () => {
    const nodes: DiagramNode[] = [
      { id: 'A', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A', shape: 'rectangle' } },
      { id: 'B', type: 'process', position: { x: 0, y: 0 }, data: { label: 'B', shape: 'rectangle' } },
    ]
    const edges: DiagramEdge[] = [
      {
        id: 'e-A-B',
        type: 'uml',
        source: 'A',
        target: 'B',
        data: { edgeType: 'association', lineStyle: 'solid' },
      },
    ]
    const result = flowToMermaid(nodes, edges, 'flowchart')
    expect(result).toContain('A --> B')
  })

  it('generates labeled edges with |label| syntax', () => {
    const nodes: DiagramNode[] = [
      { id: 'A', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A', shape: 'rectangle' } },
      { id: 'B', type: 'process', position: { x: 0, y: 0 }, data: { label: 'B', shape: 'rectangle' } },
    ]
    const edges: DiagramEdge[] = [
      {
        id: 'e-A-B',
        type: 'uml',
        source: 'A',
        target: 'B',
        label: 'yes',
        data: { edgeType: 'association', lineStyle: 'solid' },
      },
    ]
    const result = flowToMermaid(nodes, edges, 'flowchart')
    expect(result).toContain('A -->|yes| B')
  })

  it('generates complete flowchart with multiple nodes and edges', () => {
    const nodes: DiagramNode[] = [
      { id: 'S', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Start', shape: 'rounded' } },
      { id: 'D', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Check', shape: 'diamond' } },
      { id: 'Y', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Yes', shape: 'rectangle' } },
      { id: 'N', type: 'process', position: { x: 0, y: 0 }, data: { label: 'No', shape: 'rectangle' } },
    ]
    const edges: DiagramEdge[] = [
      { id: 'e1', type: 'uml', source: 'S', target: 'D', data: { edgeType: 'association', lineStyle: 'solid' } },
      { id: 'e2', type: 'uml', source: 'D', target: 'Y', label: 'yes', data: { edgeType: 'association', lineStyle: 'solid' } },
      { id: 'e3', type: 'uml', source: 'D', target: 'N', label: 'no', data: { edgeType: 'association', lineStyle: 'solid' } },
    ]
    const result = flowToMermaid(nodes, edges, 'flowchart')

    expect(result).toContain('flowchart TD')
    expect(result).toContain('S(Start)')
    expect(result).toContain('D{Check}')
    expect(result).toContain('Y[Yes]')
    expect(result).toContain('N[No]')
    expect(result).toContain('S --> D')
    expect(result).toContain('D -->|yes| Y')
    expect(result).toContain('D -->|no| N')
  })

  it('returns empty string for unknown diagram type', () => {
    const result = flowToMermaid([], [], 'sequence')
    expect(result).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Group 6: Round-trip tests
// ---------------------------------------------------------------------------

describe('Round-trip: code -> nodes -> code', () => {
  it('class diagram preserves node count and edge count', () => {
    const original = `classDiagram
class Animal {
  +String name
  +eat()
}
class Dog {
  +bark()
}
class Cat {
  +meow()
}
Animal <|-- Dog
Animal <|-- Cat`

    const { nodes, edges } = mermaidToFlow(original, 'class')
    expect(nodes).toHaveLength(3)
    expect(edges).toHaveLength(2)

    const regenerated = flowToMermaid(nodes, edges, 'class')
    const { nodes: nodes2, edges: edges2 } = mermaidToFlow(regenerated, 'class')

    expect(nodes2).toHaveLength(3)
    expect(edges2).toHaveLength(2)
  })

  it('class diagram preserves class names', () => {
    const original = `classDiagram
class Vehicle {
  +String model
}
class Truck {
  +int payload
}
Vehicle <|-- Truck`

    const { nodes, edges } = mermaidToFlow(original, 'class')
    const regenerated = flowToMermaid(nodes, edges, 'class')

    expect(regenerated).toContain('Vehicle')
    expect(regenerated).toContain('Truck')
    expect(regenerated).toContain('<|--')
  })

  it('class diagram preserves fields and methods through round-trip', () => {
    const original = `classDiagram
class Account {
  +String id
  -double balance
  +deposit()
  +withdraw()
}`
    const { nodes, edges } = mermaidToFlow(original, 'class')
    const regenerated = flowToMermaid(nodes, edges, 'class')
    const { nodes: nodes2 } = mermaidToFlow(regenerated, 'class')

    const data = classData(nodes2[0])
    expect(data.fields).toContain('+String id')
    expect(data.fields).toContain('-double balance')
    expect(data.methods).toContain('+deposit()')
    expect(data.methods).toContain('+withdraw()')
  })

  it('flowchart preserves node count and edge count', () => {
    const original = `flowchart TD
A[Start]
B{Decision}
C[End]
A --> B
B -->|yes| C`

    const { nodes, edges } = mermaidToFlow(original, 'flowchart')
    expect(nodes).toHaveLength(3)
    expect(edges).toHaveLength(2)

    const regenerated = flowToMermaid(nodes, edges, 'flowchart')
    const { nodes: nodes2, edges: edges2 } = mermaidToFlow(regenerated, 'flowchart')

    expect(nodes2).toHaveLength(3)
    expect(edges2).toHaveLength(2)
  })

  it('flowchart preserves shapes through round-trip', () => {
    const original = `flowchart TD
A[Rect]
B(Rounded)
C{Diamond}
D((Circle))`

    const { nodes } = mermaidToFlow(original, 'flowchart')
    const regenerated = flowToMermaid(nodes, [], 'flowchart')
    const { nodes: nodes2 } = mermaidToFlow(regenerated, 'flowchart')

    const shapes = nodes2.map((n) => processData(n).shape).sort()
    expect(shapes).toEqual(['circle', 'diamond', 'rectangle', 'rounded'])
  })

  it('activity diagram preserves node and edge counts', () => {
    const original = `flowchart TD
S((start))
A(Process)
E((end))
S --> A
A --> E`

    const { nodes, edges } = mermaidToFlow(original, 'activity')
    const regenerated = flowToMermaid(nodes, edges, 'activity')
    const { nodes: nodes2, edges: edges2 } = mermaidToFlow(regenerated, 'activity')

    // The node count should be preserved (start, activity, end)
    expect(nodes2.length).toBe(nodes.length)
    expect(edges2.length).toBe(edges.length)
  })
})

// ---------------------------------------------------------------------------
// Group 7: Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('handles empty string input gracefully', () => {
    const result = mermaidToFlow('', 'class')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('handles whitespace-only input gracefully', () => {
    const result = mermaidToFlow('   \n  \n  ', 'class')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('handles malformed Mermaid code without crashing (class)', () => {
    const code = `classDiagram
class {
  broken syntax {{{{
}}}}}
<|-- ???`
    expect(() => mermaidToFlow(code, 'class')).not.toThrow()
  })

  it('handles malformed Mermaid code without crashing (flowchart)', () => {
    const code = `flowchart TD
[[[broken
-->-->-->
{{{`
    expect(() => mermaidToFlow(code, 'flowchart')).not.toThrow()
  })

  it('handles very long class names', () => {
    const longName = 'A'.repeat(200)
    const code = `classDiagram
class ${longName} {
  +field1
}`
    const result = mermaidToFlow(code, 'class')
    expect(result.nodes).toHaveLength(1)
    expect(classData(result.nodes[0]).label).toBe(longName)
  })

  it('handles classes with no fields or methods', () => {
    const code = `classDiagram
class Empty {
}`
    const result = mermaidToFlow(code, 'class')
    expect(result.nodes).toHaveLength(1)

    const data = classData(result.nodes[0])
    expect(data.fields).toEqual([])
    expect(data.methods).toEqual([])
  })

  it('handles class that appears only in a relationship', () => {
    const code = `classDiagram
A <|-- B`
    const result = mermaidToFlow(code, 'class')
    // Both A and B should be created via ensureClass
    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Group 8: syncEngine wrapper (syncToCode / syncFromCode)
// ---------------------------------------------------------------------------

describe('syncEngine wrapper', () => {
  it('syncFromCode delegates to mermaidToFlow', () => {
    const code = `classDiagram
class Foo {
}`
    const result = syncFromCode(code, 'class')
    expect(result.nodes).toHaveLength(1)
    expect(classData(result.nodes[0]).label).toBe('Foo')
  })

  it('syncToCode delegates to flowToMermaid', () => {
    const nodes: DiagramNode[] = [
      {
        id: 'Bar',
        type: 'class',
        position: { x: 0, y: 0 },
        data: { label: 'Bar', fields: [], methods: [] },
      },
    ]
    const result = syncToCode(nodes, [], 'class')
    expect(result).toContain('classDiagram')
    expect(result).toContain('class Bar {')
  })

  it('syncFromCode passes existingPositions through', () => {
    const code = `classDiagram
class X {
}`
    const positions = new Map([['X', { x: 42, y: 99 }]])
    const result = syncFromCode(code, 'class', positions)
    expect(result.nodes[0].position).toEqual({ x: 42, y: 99 })
  })
})
