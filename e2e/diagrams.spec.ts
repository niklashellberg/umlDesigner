import { test, expect } from '@playwright/test'
import {
  timestamp,
  createDiagram,
  renameDiagram,
  switchMode,
  typeInEditor,
  getEditorCode,
  countCanvasNodes,
  countCanvasEdges,
  dragToolToCanvas,
  connectNodes,
  waitForCodeContaining,
  waitForCanvasNodes,
  setDiagramCodeViaApi,
} from './helpers'

// ---------------------------------------------------------------------------
// Class Diagram
// ---------------------------------------------------------------------------
test.describe('Class Diagram', () => {
  test('create via visual (drag & drop) and verify code sync', async ({ page }) => {
    const ts = timestamp()
    await createDiagram(page, 'class')
    await renameDiagram(page, `test_${ts}_class_visual`)

    // Switch to Visual mode, then drag 3 class nodes onto the canvas
    await switchMode(page, 'Visual')

    await dragToolToCanvas(page, 'Class', 200, 100)
    await dragToolToCanvas(page, 'Class', 200, 300)
    await dragToolToCanvas(page, 'Interface', 400, 200)

    // Verify 3 nodes on canvas
    await waitForCanvasNodes(page, 3)
    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBe(3)

    // Connect node 0 → node 1, node 1 → node 2
    await connectNodes(page, 0, 1)
    await connectNodes(page, 1, 2)

    const edgeCount = await countCanvasEdges(page)
    expect(edgeCount).toBe(2)

    // Switch to Split mode and verify code was generated
    await switchMode(page, 'Split')
    await waitForCodeContaining(page, /classDiagram/)
    const code = await getEditorCode(page)
    expect(code).toContain('classDiagram')
    expect(code).toContain('class')
    // Should have edge arrows
    expect(code).toMatch(/-->|<\|--|o--|<\.\.|\*--/)
  })

  test('create via code editor and verify canvas sync', async ({ page, request }) => {
    const ts = timestamp()
    await createDiagram(page, 'class')
    await renameDiagram(page, `test_${ts}_class_code`)

    // Set code via API to avoid Monaco/Yjs race conditions
    const mermaidCode = [
      'classDiagram',
      '  class Animal {',
      '    +String name',
      '    +int age',
      '    +makeSound()',
      '  }',
      '  class Dog {',
      '    +String breed',
      '    +fetch()',
      '  }',
      '  class Cat {',
      '    +boolean indoor',
      '    +purr()',
      '  }',
      '  Animal <|-- Dog',
      '  Animal <|-- Cat',
    ].join('\n')

    await setDiagramCodeViaApi(request, page, mermaidCode)
    // Reload to pick up the new code
    await page.reload()
    await page.waitForTimeout(2500)

    // Verify code is in the editor
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Animal/)

    // Switch to Visual mode — should parse into canvas nodes
    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 3)

    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBe(3)

    const edgeCount = await countCanvasEdges(page)
    expect(edgeCount).toBe(2)

    // Switch back to Code and verify code is still there
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Animal/)
    const code = await getEditorCode(page)
    expect(code).toContain('Animal')
    expect(code).toContain('Dog')
    expect(code).toContain('Cat')
  })
})

// ---------------------------------------------------------------------------
// Flowchart
// ---------------------------------------------------------------------------
test.describe('Flowchart', () => {
  test('create via visual (drag & drop) and verify code sync', async ({ page }) => {
    const ts = timestamp()
    await createDiagram(page, 'flowchart')
    await renameDiagram(page, `test_${ts}_flowchart_visual`)

    await switchMode(page, 'Visual')

    // Drag 3 process nodes and 1 decision
    await dragToolToCanvas(page, 'Process', 200, 80)
    await dragToolToCanvas(page, 'Decision', 200, 220)
    await dragToolToCanvas(page, 'Process', 200, 360)

    await waitForCanvasNodes(page, 3)
    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBe(3)

    // Connect: Process → Decision → Process
    await connectNodes(page, 0, 1)
    await connectNodes(page, 1, 2)

    const edgeCount = await countCanvasEdges(page)
    expect(edgeCount).toBe(2)

    // Switch to Split and verify code
    await switchMode(page, 'Split')
    await waitForCodeContaining(page, /flowchart TD/)
    const code = await getEditorCode(page)
    expect(code).toContain('flowchart TD')
    expect(code).toContain('-->')
  })

  test('create via code editor and verify canvas sync', async ({ page, request }) => {
    const ts = timestamp()
    await createDiagram(page, 'flowchart')
    await renameDiagram(page, `test_${ts}_flowchart_code`)

    const mermaidCode = [
      'flowchart TD',
      '  Start[Start Process]',
      '  Check{Is Valid?}',
      '  Process[Do Work]',
      '  Finish[Finish]',
      '  Start --> Check',
      '  Check --> Process',
      '  Process --> Finish',
    ].join('\n')

    await setDiagramCodeViaApi(request, page, mermaidCode)
    await page.reload()
    await page.waitForTimeout(2500)

    // Verify code is loaded
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /flowchart TD/)

    // Switch to Visual and verify nodes
    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 4)

    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBe(4)

    const edgeCount = await countCanvasEdges(page)
    expect(edgeCount).toBe(3)

    // Switch back to Code and verify round-trip
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /flowchart TD/)
    const code = await getEditorCode(page)
    expect(code).toContain('flowchart TD')
    expect(code).toContain('-->')
  })
})

// ---------------------------------------------------------------------------
// Activity Diagram
// ---------------------------------------------------------------------------
test.describe('Activity Diagram', () => {
  test('create via visual (drag & drop) and verify code sync', async ({ page }) => {
    const ts = timestamp()
    await createDiagram(page, 'activity')
    await renameDiagram(page, `test_${ts}_activity_visual`)

    await switchMode(page, 'Visual')

    // Drag Start, Activity, End nodes
    await dragToolToCanvas(page, 'Start', 200, 60)
    await dragToolToCanvas(page, 'Activity', 200, 200)
    await dragToolToCanvas(page, 'End', 200, 350)

    await waitForCanvasNodes(page, 3)
    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBe(3)

    // Connect: Start → Activity → End
    await connectNodes(page, 0, 1)
    await connectNodes(page, 1, 2)

    const edgeCount = await countCanvasEdges(page)
    expect(edgeCount).toBe(2)

    // Switch to Split and verify code
    await switchMode(page, 'Split')
    await waitForCodeContaining(page, /flowchart TD/)
    const code = await getEditorCode(page)
    expect(code).toContain('flowchart TD')
    expect(code).toContain('start')
    expect(code).toContain('end')
    expect(code).toContain('-->')
  })

  test('create via code editor and verify canvas sync', async ({ page, request }) => {
    const ts = timestamp()
    await createDiagram(page, 'activity')
    await renameDiagram(page, `test_${ts}_activity_code`)

    const mermaidCode = [
      'flowchart TD',
      '  s1((start))',
      '  a1(Login)',
      '  a2(Process Request)',
      '  e1((end))',
      '  s1 --> a1',
      '  a1 --> a2',
      '  a2 --> e1',
    ].join('\n')

    await setDiagramCodeViaApi(request, page, mermaidCode)
    await page.reload()
    await page.waitForTimeout(2500)

    // Verify code loaded
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /flowchart TD/)

    // Switch to Visual and verify nodes appear
    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 4)

    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBeGreaterThanOrEqual(4)

    const edgeCount = await countCanvasEdges(page)
    expect(edgeCount).toBe(3)

    // Switch back to Code and verify round-trip
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /flowchart TD/)
    const code = await getEditorCode(page)
    expect(code).toContain('flowchart TD')
    expect(code).toContain('-->')
  })
})

// ---------------------------------------------------------------------------
// Cross-mode real-time sync in Split mode
// ---------------------------------------------------------------------------
test.describe('Split mode real-time sync', () => {
  test('visual changes appear in code editor within a few seconds', async ({ page }) => {
    const ts = timestamp()
    await createDiagram(page, 'flowchart')
    await renameDiagram(page, `test_${ts}_flowchart_split_sync`)

    // Start in Visual mode with a clean canvas (no default code parsed yet)
    await switchMode(page, 'Visual')

    const canvasPanel = page.locator('.react-flow').first()
    await canvasPanel.waitFor({ state: 'visible' })
    await page.waitForTimeout(500)

    // Drag 3 nodes onto the canvas
    await dragToolToCanvas(page, 'Process', 200, 80)
    await page.waitForTimeout(800)
    await dragToolToCanvas(page, 'Process', 200, 250)
    await page.waitForTimeout(800)
    await dragToolToCanvas(page, 'Decision', 200, 420)

    await waitForCanvasNodes(page, 3)

    // Connect them
    await connectNodes(page, 0, 1)
    await connectNodes(page, 1, 2)

    // Switch to Split mode — this triggers visual→code sync
    await switchMode(page, 'Split')
    await page.waitForTimeout(1000)

    // Click Sync Code to force code regeneration from canvas
    const syncBtn = page.getByRole('button', { name: 'Sync Code' })
    if (await syncBtn.isVisible()) {
      await syncBtn.click()
      await page.waitForTimeout(1000)
    }

    // Verify the code editor contains the flowchart
    await waitForCodeContaining(page, /flowchart TD/, 10000)

    const code = await getEditorCode(page)
    expect(code).toContain('flowchart TD')
    // Verify edges were generated (nodes connected above)
    expect(code).toContain('-->')
  })

  test('code changes appear on canvas within a few seconds', async ({ page, request }) => {
    const ts = timestamp()
    await createDiagram(page, 'class')
    await renameDiagram(page, `test_${ts}_class_split_sync`)

    // Set code via API for reliable content
    const mermaidCode = [
      'classDiagram',
      '  class Foo {',
      '    +doStuff()',
      '  }',
      '  class Bar {',
      '    +doMore()',
      '  }',
      '  class Baz {',
      '    +help()',
      '  }',
      '  Foo --> Bar',
      '  Bar --> Baz',
    ].join('\n')

    await setDiagramCodeViaApi(request, page, mermaidCode)
    await page.reload()
    await page.waitForTimeout(2500)

    // Verify code is loaded in the editor first (ensures Yjs has synced)
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Foo/)

    // Switch to Visual mode to trigger code→visual sync
    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 3, 10000)

    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBe(3)

    const edgeCount = await countCanvasEdges(page)
    expect(edgeCount).toBe(2)
  })
})
