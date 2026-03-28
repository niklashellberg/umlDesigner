import { test, expect } from '@playwright/test'
import {
  timestamp,
  createDiagram,
  renameDiagram,
  switchMode,
  getEditorCode,
  countCanvasNodes,
  countCanvasEdges,
  dragToolToCanvas,
  connectNodes,
  waitForCodeContaining,
  waitForCanvasNodes,
  setDiagramCodeViaApi,
  waitForSaved,
  getDiagramListTitles,
  createDiagramViaApi,
  deleteDiagramViaApi,
  goBackToHome,
  extractDiagramId,
  selectCanvasNode,
  getPropertyPanelValue,
  setPropertyPanelValue,
} from './helpers'

// ---------------------------------------------------------------------------
// Test Group 1: Sequence Diagram (currently untested diagram type)
// ---------------------------------------------------------------------------
test.describe('Sequence Diagram', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('create sequence diagram and verify default code', async ({ page }) => {
    const url = await createDiagram(page, 'sequence')
    diagramId = extractDiagramId(url)

    // Default sequence code should be loaded
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /sequenceDiagram/)
    const code = await getEditorCode(page)
    expect(code).toContain('sequenceDiagram')
  })

  test('set sequence code via API and verify after reload', async ({ page, request }) => {
    const url = await createDiagram(page, 'sequence')
    diagramId = extractDiagramId(url)

    const seqCode = [
      'sequenceDiagram',
      '    Alice->>Bob: Hello',
      '    Bob-->>Alice: Hi',
    ].join('\n')

    await setDiagramCodeViaApi(request, page, seqCode)
    await page.reload()
    await page.waitForTimeout(2500)

    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Alice/)
    const code = await getEditorCode(page)
    expect(code).toContain('Alice')
    expect(code).toContain('Bob')
    expect(code).toContain('Hello')
  })

  test('rename sequence diagram and verify on home page', async ({ page, request }) => {
    const ts = timestamp()
    const url = await createDiagram(page, 'sequence')
    diagramId = extractDiagramId(url)

    const name = `SeqDiagram_${ts}_${Date.now()}`
    await renameDiagram(page, name)

    await goBackToHome(page)
    const titles = await getDiagramListTitles(page)
    expect(titles).toContain(name)
  })
})

// ---------------------------------------------------------------------------
// Test Group 2: Keyboard Shortcuts
// ---------------------------------------------------------------------------
test.describe('Keyboard Shortcuts', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('Ctrl+S triggers save', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'KbSave_Test',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start]\n',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Update code via API so there is something to save
    const updatedCode = 'flowchart TD\n  A[Start] --> B[End]\n'
    await setDiagramCodeViaApi(request, page, updatedCode)
    await page.reload()
    await page.waitForTimeout(2500)

    // Press Ctrl+S (Cmd+S on Mac)
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${mod}+s`)

    // Wait for the saved indicator to update
    await waitForSaved(page)
  })

  test('Delete key removes selected node', async ({ page }) => {
    const url = await createDiagram(page, 'flowchart')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')

    // Drag 2 process nodes
    await dragToolToCanvas(page, 'Process', 200, 100)
    await dragToolToCanvas(page, 'Process', 200, 300)
    await waitForCanvasNodes(page, 2)

    const initialCount = await countCanvasNodes(page)
    expect(initialCount).toBe(2)

    // Click the first node to select it
    await selectCanvasNode(page, 0)

    // Press Delete to remove it
    await page.keyboard.press('Delete')
    await page.waitForTimeout(500)

    // Verify node count decreased
    const afterCount = await countCanvasNodes(page)
    expect(afterCount).toBe(1)
  })

  test('Escape deselects all nodes', async ({ page, request }) => {
    const code = [
      'classDiagram',
      '  class Foo {',
      '    +run()',
      '  }',
      '  class Bar {',
      '    +stop()',
      '  }',
    ].join('\n')
    diagramId = await createDiagramViaApi(request, {
      title: 'EscapeDeselect_Test',
      type: 'class',
      code,
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Must start in Code mode and verify code is loaded, then switch to Visual
    // so the code->visual sync handler parses the Mermaid into canvas nodes.
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Foo/)
    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 2)

    // Click a node to select it
    await selectCanvasNode(page, 0)

    // Verify something is selected (node should have the selected class)
    const selectedBefore = await page.locator('.react-flow__node.selected').count()
    expect(selectedBefore).toBeGreaterThanOrEqual(1)

    // Press Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Verify no nodes are selected
    const selectedAfter = await page.locator('.react-flow__node.selected').count()
    expect(selectedAfter).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test Group 3: Property Panel Editing
// ---------------------------------------------------------------------------
test.describe('Property Panel Editing', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('edit class name in property panel and verify sync to code', async ({ page }) => {
    const url = await createDiagram(page, 'class')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')

    // Drag a Class node onto canvas
    await dragToolToCanvas(page, 'Class', 200, 150)
    await waitForCanvasNodes(page, 1)

    // Click the node to select it — property panel should appear
    await selectCanvasNode(page, 0)

    // Verify property panel is visible
    const panel = page.locator('text=Properties')
    await expect(panel).toBeVisible({ timeout: 3000 })

    // Read the current class name
    const currentName = await getPropertyPanelValue(page, 'Class Name')
    expect(currentName).toBeTruthy()

    // Edit the class name
    const newClassName = 'MyCustomClass'
    await setPropertyPanelValue(page, 'Class Name', newClassName)

    // Verify the node label updates on the canvas
    await expect(page.locator('.react-flow__node').first()).toContainText(newClassName)

    // Switch to Code mode and verify the new class name appears in the Mermaid code
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, new RegExp(newClassName))
    const code = await getEditorCode(page)
    expect(code).toContain(newClassName)
  })
})

// ---------------------------------------------------------------------------
// Test Group 4: Delete Diagram from Home Page
// ---------------------------------------------------------------------------
test.describe('Delete Diagram from Home Page', () => {
  test('delete diagram from home page via card button', async ({ page, request }) => {
    const ts = Date.now()
    const title = `ToDelete_${ts}`

    const id = await createDiagramViaApi(request, {
      title,
      type: 'class',
      code: 'classDiagram\n  class Foo\n',
    })

    // Navigate to home page, verify it exists
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    let titles = await getDiagramListTitles(page)
    expect(titles).toContain(title)

    // Find the card with the title and hover over it to reveal delete button
    const card = page.locator('.cursor-pointer').filter({ hasText: title })
    await card.hover()
    await page.waitForTimeout(300)

    // Set up dialog handler to accept the confirmation
    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })

    // Click the delete button
    const deleteBtn = card.locator('button[title="Delete diagram"]')
    await deleteBtn.click()

    // Wait for the card to disappear
    await page.waitForTimeout(1500)

    // Refresh to ensure server-side state is up to date
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    titles = await getDiagramListTitles(page)
    expect(titles).not.toContain(title)
  })
})

// ---------------------------------------------------------------------------
// Test Group 5: Error Resilience
// ---------------------------------------------------------------------------
test.describe('Error Resilience', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('navigating to nonexistent diagram shows 404', async ({ page }) => {
    const response = await page.goto('/diagram/00000000-0000-0000-0000-000000000000')
    // Next.js notFound() returns a 404 status
    expect(response?.status()).toBe(404)
  })

  test('invalid Mermaid code does not crash the app', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'InvalidCode_Test',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]\n',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Set invalid code via API
    await setDiagramCodeViaApi(request, page, 'this is not valid mermaid code }{][')
    await page.reload()
    await page.waitForTimeout(2500)

    // Switch between modes — app should not crash
    await switchMode(page, 'Code')
    await page.waitForTimeout(500)
    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)
    await switchMode(page, 'Split')
    await page.waitForTimeout(500)

    // Verify the app is still functional (no blank screen)
    const header = page.locator('header')
    await expect(header).toBeVisible()

    // Verify we can still switch back to code mode
    await switchMode(page, 'Code')
    const editor = page.locator('.monaco-editor')
    await expect(editor).toBeVisible()
  })

  // BUG: When a diagram is initially created with invalid Mermaid code and then
  // updated to valid code via API, the code-to-canvas sync fails to parse nodes
  // on mode switch (Code -> Visual). The canvas remains empty even though the
  // code editor shows valid flowchart code. The syncFromCode parser appears to
  // not produce nodes in this scenario. This does not happen when the diagram
  // starts with valid code.
  test.fail('app recovers when setting valid code after invalid code', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'Recovery_Test',
      type: 'flowchart',
      code: 'not valid mermaid',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Set valid code
    await setDiagramCodeViaApi(request, page, 'flowchart TD\n  A[Recovered] --> B[Working]\n')
    await page.reload()
    await page.waitForTimeout(2500)

    // Must go to Code first so the code->visual sync triggers correctly
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Recovered/)

    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 2, 12000)
    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Test Group 6: Sync Code Button
// ---------------------------------------------------------------------------
test.describe('Sync Code Button', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('Sync Code button generates code from canvas nodes', async ({ page }) => {
    const url = await createDiagram(page, 'flowchart')
    diagramId = extractDiagramId(url)

    // Switch to Visual mode and create nodes
    await switchMode(page, 'Visual')
    await dragToolToCanvas(page, 'Process', 200, 100)
    await dragToolToCanvas(page, 'Process', 200, 300)
    await waitForCanvasNodes(page, 2)

    // Connect them
    await connectNodes(page, 0, 1)
    const edgeCount = await countCanvasEdges(page)
    expect(edgeCount).toBe(1)

    // Switch to Split mode
    await switchMode(page, 'Split')
    await page.waitForTimeout(500)

    // Click Sync Code button
    const syncBtn = page.getByRole('button', { name: 'Sync Code' })
    await expect(syncBtn).toBeVisible({ timeout: 3000 })
    await syncBtn.click()
    await page.waitForTimeout(1000)

    // Verify code was generated with flowchart and edges
    await waitForCodeContaining(page, /flowchart TD/)
    const code = await getEditorCode(page)
    expect(code).toContain('flowchart TD')
    expect(code).toContain('-->')
  })

  test('Sync Code updates code after canvas modification', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'SyncCodeUpdate_Test',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start]\n',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Must go to Code first so the code->visual sync triggers correctly
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Start/)

    // Switch to Visual to parse code into nodes
    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 1, 12000)

    // Add another node
    await dragToolToCanvas(page, 'Process', 200, 300)
    await waitForCanvasNodes(page, 2)

    // Connect them
    await connectNodes(page, 0, 1)

    // Switch to Split mode
    await switchMode(page, 'Split')
    await page.waitForTimeout(500)

    // Click Sync Code
    const syncBtn = page.getByRole('button', { name: 'Sync Code' })
    if (await syncBtn.isVisible()) {
      await syncBtn.click()
      await page.waitForTimeout(1000)
    }

    // Verify updated code
    await waitForCodeContaining(page, /flowchart TD/)
    const code = await getEditorCode(page)
    expect(code).toContain('-->')
  })
})
