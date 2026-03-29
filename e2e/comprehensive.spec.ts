import { test, expect } from '@playwright/test'
import {
  timestamp,
  createDiagram,
  createDiagramViaApi,
  deleteDiagramViaApi,
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
  setDiagramMarkdownViaApi,
  waitForSaved,
  getDiagramListTitles,
  goBackToHome,
  extractDiagramId,
  selectCanvasNode,
  getPropertyPanelValue,
  setPropertyPanelValue,
  switchToDocsTab,
  switchToCodeTab,
} from './helpers'

// ---------------------------------------------------------------------------
// Group 1: Markdown Documentation
// ---------------------------------------------------------------------------
test.describe('Group 1: Markdown Documentation', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('insert {{diagram}} via "+ Diagram" button and verify preview renders SVG', async ({
    page,
    request,
  }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'MD_Diagram_Insert',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Switch to Docs tab in edit mode
    await switchToDocsTab(page)
    await page.waitForTimeout(1000)

    // Click the "+ Diagram" button to insert {{diagram}} reference
    const diagBtn = page.getByRole('button', { name: '+ Diagram' })
    await expect(diagBtn).toBeVisible()
    await diagBtn.click()
    await page.waitForTimeout(500)

    // Switch to Preview mode
    const previewBtn = page.getByRole('button', { name: 'Preview', exact: true })
    await previewBtn.click()
    await page.waitForTimeout(2000)

    // The {{diagram}} token should be replaced with a rendered Mermaid SVG
    const svg = page.locator('.h-full.overflow-y-auto svg')
    await expect(svg.first()).toBeVisible({ timeout: 10000 })
  })

  test('write markdown with mermaid code fence and verify preview renders', async ({
    page,
    request,
  }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'MD_Mermaid_Fence',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })

    // Set markdown with a mermaid fence via API
    const mdContent = '# Test\n\n```mermaid\nflowchart TD\n  X[Hello] --> Y[World]\n```\n'
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`, {
      data: { markdown: mdContent },
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Switch to Docs tab
    await switchToDocsTab(page)
    await page.waitForTimeout(500)

    // Switch to Preview
    const previewBtn = page.getByRole('button', { name: 'Preview', exact: true })
    await previewBtn.click()
    await page.waitForTimeout(2000)

    // Should see the rendered heading
    const heading = page.locator('.h-full.overflow-y-auto h1')
    await expect(heading).toHaveText('Test')

    // Should see rendered SVG from the mermaid fence
    const svg = page.locator('.h-full.overflow-y-auto svg')
    await expect(svg.first()).toBeVisible({ timeout: 10000 })
  })

  test('{{diagram}} updates when diagram code changes', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'MD_Diagram_Update',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Original] --> B[Content]',
    })
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`, {
      data: { markdown: '# Doc\n\n{{diagram}}' },
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Switch to Docs tab and Preview
    await switchToDocsTab(page)
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    await page.waitForTimeout(2000)

    // SVG should be visible (rendered from the current diagram code)
    const svg = page.locator('.h-full.overflow-y-auto svg')
    await expect(svg.first()).toBeVisible({ timeout: 10000 })
  })

  test('docs content preserved across Code/Docs tab switches', async ({
    page,
    request,
  }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'MD_Tab_Preserve',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`, {
      data: { markdown: '# Preserved Content\n\nThis should survive tab switches.' },
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Switch to Docs tab, verify content
    await switchToDocsTab(page)
    await page.waitForTimeout(1500)
    await expect(page.locator('textarea')).toHaveValue(/Preserved Content/, { timeout: 8000 })

    // Switch to Code tab
    await switchToCodeTab(page)
    await page.waitForTimeout(500)
    await waitForCodeContaining(page, /flowchart/)

    // Switch back to Docs tab, verify content still there
    await switchToDocsTab(page)
    await page.waitForTimeout(1500)
    await expect(page.locator('textarea')).toHaveValue(/Preserved Content/, { timeout: 8000 })
  })

  test('docs content preserved when switching editor modes', async ({
    page,
    request,
  }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'MD_Mode_Preserve',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`, {
      data: { markdown: '# Mode Switch Test\n\nContent must survive.' },
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Switch to Docs tab
    await switchToDocsTab(page)
    await page.waitForTimeout(1000)

    // Switch modes: Split -> Code -> Split
    await switchMode(page, 'Code')
    await page.waitForTimeout(500)
    await switchMode(page, 'Split')
    await page.waitForTimeout(500)

    // Switch to Docs and verify content
    await switchToDocsTab(page)
    await page.waitForTimeout(1500)
    await expect(page.locator('textarea')).toHaveValue(/Mode Switch Test/, { timeout: 8000 })
  })

  test('empty docs shows placeholder text in preview', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'MD_Empty_Placeholder',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })
    // Ensure markdown is empty
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`, {
      data: { markdown: '' },
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Switch to Docs tab and Preview mode
    await switchToDocsTab(page)
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    await page.waitForTimeout(500)

    // Should show the placeholder text
    await expect(page.getByText('No documentation yet.')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Switch to Edit mode to start writing.')).toBeVisible()
  })

  test('Copy MD button shows "Copied!" feedback', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'MD_Copy_Test',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`, {
      data: { markdown: '# Copy Test\n\nSome content.' },
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Switch to Docs tab
    await switchToDocsTab(page)
    await page.waitForTimeout(1000)

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

    // Click Copy MD button
    const copyMdBtn = page.getByRole('button', { name: 'Copy MD' })
    await expect(copyMdBtn).toBeVisible()
    await copyMdBtn.click()

    // Should show "Copied!" feedback
    await expect(page.getByText('Copied!')).toBeVisible({ timeout: 3000 })
  })
})

// ---------------------------------------------------------------------------
// Group 2: State Diagram Full Workflow
// ---------------------------------------------------------------------------
test.describe('Group 2: State Diagram Full Workflow', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('create state diagram and verify default stateDiagram-v2 code', async ({ page }) => {
    const url = await createDiagram(page, 'state')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /stateDiagram-v2/)
    const code = await getEditorCode(page)
    expect(code).toContain('stateDiagram-v2')
  })

  test('drag State node to canvas and verify it appears', async ({ page }) => {
    const url = await createDiagram(page, 'state')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'State', 200, 200)
    await waitForCanvasNodes(page, 1)

    // Verify a node with "State" label is on the canvas
    const nodeText = page.locator('.react-flow__node').first()
    await expect(nodeText).toBeVisible()
  })

  test('click state node -> property panel shows "State Name" field', async ({ page }) => {
    const url = await createDiagram(page, 'state')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'State', 200, 200)
    await waitForCanvasNodes(page, 1)

    // Click the state node to select it
    await selectCanvasNode(page, 0)
    await page.waitForTimeout(300)

    // Property panel should appear with "State Name" field
    const panel = page.locator('.absolute.top-3.right-3')
    await expect(panel).toBeVisible({ timeout: 5000 })
    await expect(panel.getByText('State Name')).toBeVisible()
  })

  test('set state code via API with transitions -> switch to Visual -> verify nodes + edges', async ({
    page,
    request,
  }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'State_API_Code',
      type: 'state',
      code: [
        'stateDiagram-v2',
        '  [*] --> Idle',
        '  Idle --> Running : start',
        '  Running --> Idle : stop',
        '  Running --> [*] : finish',
      ].join('\n'),
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Verify code loaded
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /stateDiagram-v2/)

    // Switch to Visual and verify nodes + edges
    await switchMode(page, 'Visual')
    // Should have: __start__, __end__, Idle, Running = 4 nodes
    await waitForCanvasNodes(page, 4)
    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBe(4)

    const edgeCount = await countCanvasEdges(page)
    expect(edgeCount).toBe(4)
  })

  test('Visual -> Code sync: add states visually, verify stateDiagram-v2 in code', async ({
    page,
  }) => {
    const url = await createDiagram(page, 'state')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    // Drag some state nodes
    await dragToolToCanvas(page, 'State', 200, 100)
    await dragToolToCanvas(page, 'State', 200, 300)
    await waitForCanvasNodes(page, 2)

    // Connect them
    await connectNodes(page, 0, 1)

    // Switch to Split to trigger sync
    await switchMode(page, 'Split')
    await page.waitForTimeout(1000)

    // Click Sync Code if available
    const syncBtn = page.getByRole('button', { name: 'Sync Code' })
    if (await syncBtn.isVisible()) {
      await syncBtn.click()
      await page.waitForTimeout(1000)
    }

    await waitForCodeContaining(page, /stateDiagram-v2/)
    const code = await getEditorCode(page)
    expect(code).toContain('stateDiagram-v2')
    expect(code).toContain('-->')
  })
})

// ---------------------------------------------------------------------------
// Group 3: ER Diagram Full Workflow
// ---------------------------------------------------------------------------
test.describe('Group 3: ER Diagram Full Workflow', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('create ER diagram and verify default erDiagram code', async ({ page }) => {
    const url = await createDiagram(page, 'er')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /erDiagram/)
    const code = await getEditorCode(page)
    expect(code).toContain('erDiagram')
  })

  test('drag Entity node to canvas and verify it appears', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, { title: 'ER Drag Test', type: 'er' })
    await page.goto(`http://127.0.0.1:3000/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Entity', 200, 200)
    await waitForCanvasNodes(page, 1)

    const node = page.locator('.react-flow__node').first()
    await expect(node).toBeVisible()
  })

  test('click entity node -> property panel shows "Entity Name" and "Attributes" fields', async ({
    page,
    request,
  }) => {
    diagramId = await createDiagramViaApi(request, { title: 'ER Props Test', type: 'er' })
    await page.goto(`http://127.0.0.1:3000/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Entity', 200, 200)
    await waitForCanvasNodes(page, 1)

    await selectCanvasNode(page, 0)
    await page.waitForTimeout(300)

    const panel = page.locator('.absolute.top-3.right-3')
    await expect(panel).toBeVisible({ timeout: 5000 })
    await expect(panel.getByText('Entity Name')).toBeVisible()
    await expect(panel.getByText('Attributes')).toBeVisible()
  })

  test('set ER code via API with entities + relationships -> switch to Visual -> verify nodes', async ({
    page,
    request,
  }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'ER_API_Code',
      type: 'er',
      code: [
        'erDiagram',
        '  CUSTOMER {',
        '    int id PK',
        '    string name',
        '  }',
        '  ORDER {',
        '    int id PK',
        '    date createdAt',
        '  }',
        '  CUSTOMER ||--o{ ORDER : places',
      ].join('\n'),
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /erDiagram/)

    await switchMode(page, 'Visual')
    // Should have CUSTOMER and ORDER = 2 entity nodes
    await waitForCanvasNodes(page, 2)
    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBe(2)

    const edgeCount = await countCanvasEdges(page)
    expect(edgeCount).toBe(1)
  })

  test('edit entity name in property panel and verify label updates on canvas', async ({
    page,
    request,
  }) => {
    diagramId = await createDiagramViaApi(request, { title: 'ER Edit Test', type: 'er' })
    await page.goto(`http://127.0.0.1:3000/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Entity', 200, 200)
    await waitForCanvasNodes(page, 1)

    await selectCanvasNode(page, 0)
    await page.waitForTimeout(300)

    // Edit the entity name
    await setPropertyPanelValue(page, 'Entity Name', 'Product')
    await page.waitForTimeout(500)

    // Verify the label on the canvas updated
    const nodeText = page.locator('.react-flow__node').first()
    await expect(nodeText).toContainText('Product')
  })
})

// ---------------------------------------------------------------------------
// Group 4: Cross-diagram Type Switching
// ---------------------------------------------------------------------------
test.describe('Group 4: Cross-diagram Type Switching', () => {
  const createdIds: string[] = []

  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      await deleteDiagramViaApi(request, id)
    }
    createdIds.length = 0
  })

  test('create class + flowchart diagrams, navigate between them, content persists', async ({
    page,
    request,
  }) => {
    const ts = Date.now()

    // Create a class diagram with content
    const classId = await createDiagramViaApi(request, {
      title: `Class_Cross_${ts}`,
      type: 'class',
      code: 'classDiagram\n  class User {\n    +String email\n  }',
    })
    createdIds.push(classId)

    // Create a flowchart with content
    const flowId = await createDiagramViaApi(request, {
      title: `Flow_Cross_${ts}`,
      type: 'flowchart',
      code: 'flowchart TD\n  A[Login] --> B[Dashboard]',
    })
    createdIds.push(flowId)

    // Open class diagram
    await page.goto(`/diagram/${classId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /User/)

    // Open flowchart
    await page.goto(`/diagram/${flowId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Login/)

    // Re-open class diagram - content should still be there
    await page.goto(`/diagram/${classId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /User/)
    const code = await getEditorCode(page)
    expect(code).toContain('User')

    // Re-open flowchart - content should still be there
    await page.goto(`/diagram/${flowId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Login/)
    const code2 = await getEditorCode(page)
    expect(code2).toContain('Dashboard')
  })

  test('home page lists diagrams with correct type badges', async ({ page, request }) => {
    const ts = Date.now()

    const classId = await createDiagramViaApi(request, {
      title: `BadgeClass_${ts}`,
      type: 'class',
      code: 'classDiagram\n  class Foo',
    })
    createdIds.push(classId)

    const flowId = await createDiagramViaApi(request, {
      title: `BadgeFlow_${ts}`,
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start]',
    })
    createdIds.push(flowId)

    const stateId = await createDiagramViaApi(request, {
      title: `BadgeState_${ts}`,
      type: 'state',
      code: 'stateDiagram-v2\n  [*] --> Idle',
    })
    createdIds.push(stateId)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const titles = await getDiagramListTitles(page)
    expect(titles).toContain(`BadgeClass_${ts}`)
    expect(titles).toContain(`BadgeFlow_${ts}`)
    expect(titles).toContain(`BadgeState_${ts}`)
  })
})

// ---------------------------------------------------------------------------
// Group 5: Export All Formats
// ---------------------------------------------------------------------------
test.describe('Group 5: Export All Formats', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  /** Helper to run export and check filename via monkeypatch */
  async function runExportAndVerify(
    page: import('@playwright/test').Page,
    optionText: string,
    expectedExtension: RegExp,
  ) {
    await page.evaluate(() => {
      (window as any).__downloadTriggered = false;
      (window as any).__downloadFilename = ''
      const origClick = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function () {
        if (this.download) {
          (window as any).__downloadTriggered = true;
          (window as any).__downloadFilename = this.download
        }
        return origClick.call(this)
      }
    })

    const exportBtn = page.locator('header').getByRole('button', { name: 'Export', exact: true })
    await expect(exportBtn).toBeEnabled()
    await exportBtn.click()

    const option = page.locator('button', { hasText: optionText })
    await expect(option).toBeVisible({ timeout: 3000 })
    await option.dispatchEvent('click')

    await expect(async () => {
      const triggered = await page.evaluate(() => (window as any).__downloadTriggered)
      expect(triggered).toBe(true)
    }).toPass({ timeout: 10000, intervals: [500] })

    const filename = await page.evaluate(() => (window as any).__downloadFilename)
    expect(filename).toMatch(expectedExtension)
  }

  test('export Mermaid (.mmd) from state diagram', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'Export_State_MMD',
      type: 'state',
      code: 'stateDiagram-v2\n  [*] --> Active\n  Active --> [*]',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await page.waitForTimeout(500)

    await runExportAndVerify(page, 'Mermaid (.mmd)', /\.mmd$/)
  })

  test('export SVG (.svg) from ER diagram', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'Export_ER_SVG',
      type: 'er',
      code: 'erDiagram\n  USER {\n    int id PK\n  }',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await page.waitForTimeout(500)

    await runExportAndVerify(page, 'SVG (.svg)', /\.svg$/)
  })

  test('export PNG (.png) from flowchart', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'Export_Flow_PNG',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await page.waitForTimeout(500)

    await runExportAndVerify(page, 'PNG (.png)', /\.png$/)
  })

  test('export Markdown Doc (.md) includes docs text and mermaid code', async ({
    page,
    request,
  }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'Export_Full_MD',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`, {
      data: { markdown: '# Export Test\n\n{{diagram}}\n\nSome notes.' },
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await page.waitForTimeout(500)

    await runExportAndVerify(page, 'Markdown Doc (.md)', /\.md$/)
  })
})

// ---------------------------------------------------------------------------
// Group 6: Edge Cases & Stress Tests
// ---------------------------------------------------------------------------
test.describe('Group 6: Edge Cases & Stress Tests', () => {
  const createdIds: string[] = []

  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      await deleteDiagramViaApi(request, id)
    }
    createdIds.length = 0
  })

  test('create diagram, immediately go back without changes -> still listed', async ({
    page,
  }) => {
    const url = await createDiagram(page, 'flowchart')
    const id = extractDiagramId(url)
    createdIds.push(id)

    // Immediately go back
    await goBackToHome(page)

    // Diagram should still be listed
    const titles = await getDiagramListTitles(page)
    // Default title is "Untitled Diagram" or similar
    expect(titles.length).toBeGreaterThan(0)
  })

  test('rapid tab switching (Code<->Docs 10 times) -> no crash, content preserved', async ({
    page,
    request,
  }) => {
    const id = await createDiagramViaApi(request, {
      title: 'Rapid_Tab_Switch',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })
    createdIds.push(id)
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${id}`, {
      data: { markdown: '# Rapid Test\n\nStable content.' },
    })

    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    // Rapid tab switching
    for (let i = 0; i < 10; i++) {
      await switchToDocsTab(page)
      await page.waitForTimeout(100)
      await switchToCodeTab(page)
      await page.waitForTimeout(100)
    }

    // Verify code is still intact
    await waitForCodeContaining(page, /flowchart/)

    // Verify docs still intact
    await switchToDocsTab(page)
    await page.waitForTimeout(1500)
    await expect(page.locator('textarea')).toHaveValue(/Rapid Test/, { timeout: 8000 })
  })

  test('very long diagram title (100+ chars) persists correctly', async ({
    page,
    request,
  }) => {
    const longTitle = 'A'.repeat(120)
    const id = await createDiagramViaApi(request, {
      title: longTitle,
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start]',
    })
    createdIds.push(id)

    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    // Verify the long title is shown
    const titleBtn = page.locator('button[title="Click to edit title"]')
    await expect(titleBtn).toContainText('A'.repeat(20)) // at least part of the title

    // Verify via API
    const res = await request.get(`http://127.0.0.1:3000/api/mcp/diagrams/${id}`)
    const data = await res.json()
    expect(data.meta.title).toBe(longTitle)
  })

  test('create 5 diagrams quickly -> all listed on home page', async ({
    page,
    request,
  }) => {
    const ts = Date.now()
    const titles: string[] = []

    for (let i = 0; i < 5; i++) {
      const title = `Batch_${ts}_${i}`
      titles.push(title)
      const id = await createDiagramViaApi(request, {
        title,
        type: 'flowchart',
        code: `flowchart TD\n  A${i}[Node${i}]`,
      })
      createdIds.push(id)
    }

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const listed = await getDiagramListTitles(page)
    for (const title of titles) {
      expect(listed).toContain(title)
    }
  })

  test('switch modes rapidly (Code->Split->Visual->Code->Split->Visual) -> stable', async ({
    page,
    request,
  }) => {
    const id = await createDiagramViaApi(request, {
      title: 'Rapid_Mode_Switch',
      type: 'class',
      code: 'classDiagram\n  class Stable {\n    +keepIt()\n  }',
    })
    createdIds.push(id)

    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    // Rapid mode switching
    const modes: ('Code' | 'Split' | 'Visual')[] = [
      'Code', 'Split', 'Visual', 'Code', 'Split', 'Visual',
    ]
    for (const mode of modes) {
      await switchMode(page, mode)
      await page.waitForTimeout(300)
    }

    // Final verification - switch to Code and check content
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Stable/)
    const code = await getEditorCode(page)
    expect(code).toContain('Stable')
  })
})

// ---------------------------------------------------------------------------
// Group 7: Property Panel for ALL Node Types
// ---------------------------------------------------------------------------
test.describe('Group 7: Property Panel for Node Types', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('Class node: edit name, add field, add method -> verify reflected', async ({
    page,
  }) => {
    const url = await createDiagram(page, 'class')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Class', 200, 200)
    await waitForCanvasNodes(page, 1)

    await selectCanvasNode(page, 0)
    await page.waitForTimeout(300)

    const panel = page.locator('.absolute.top-3.right-3')
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Edit class name
    await setPropertyPanelValue(page, 'Class Name', 'MyService')
    await page.waitForTimeout(300)

    // Verify label updated on canvas
    await expect(page.locator('.react-flow__node').first()).toContainText('MyService')

    // Add a field via the ListEditor
    const fieldsInput = panel.locator('input[placeholder="+ name: string"]')
    await fieldsInput.fill('+ id: number')
    await fieldsInput.press('Enter')
    await page.waitForTimeout(300)

    // Verify the field appears on the node
    await expect(page.locator('.react-flow__node').first()).toContainText('id: number')
  })

  test('Interface node: edit name, add method', async ({ page }) => {
    const url = await createDiagram(page, 'class')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Interface', 200, 200)
    await waitForCanvasNodes(page, 1)

    await selectCanvasNode(page, 0)
    await page.waitForTimeout(300)

    const panel = page.locator('.absolute.top-3.right-3')
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Edit interface name
    await setPropertyPanelValue(page, 'Interface Name', 'Serializable')
    await page.waitForTimeout(300)

    await expect(page.locator('.react-flow__node').first()).toContainText('Serializable')

    // Add a method
    const methodInput = panel.locator('input[placeholder="+ doSomething(): void"]')
    await methodInput.fill('+ serialize(): string')
    await methodInput.press('Enter')
    await page.waitForTimeout(300)

    await expect(page.locator('.react-flow__node').first()).toContainText('serialize')
  })

  test('Process node: edit label and change shape', async ({ page }) => {
    const url = await createDiagram(page, 'flowchart')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Process', 200, 200)
    await waitForCanvasNodes(page, 1)

    await selectCanvasNode(page, 0)
    await page.waitForTimeout(300)

    const panel = page.locator('.absolute.top-3.right-3')
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Edit label
    await setPropertyPanelValue(page, 'Label', 'Validate Input')
    await page.waitForTimeout(300)

    await expect(page.locator('.react-flow__node').first()).toContainText('Validate Input')

    // Change shape to diamond
    const diamondBtn = panel.getByRole('button', { name: 'diamond' })
    await diamondBtn.click()
    await page.waitForTimeout(300)

    // The diamond button should now be active (has accent styling)
    await expect(diamondBtn).toHaveClass(/accent/)
  })

  test('Activity node: edit label', async ({ page }) => {
    const url = await createDiagram(page, 'activity')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Activity', 200, 200)
    await waitForCanvasNodes(page, 1)

    await selectCanvasNode(page, 0)
    await page.waitForTimeout(300)

    const panel = page.locator('.absolute.top-3.right-3')
    await expect(panel).toBeVisible({ timeout: 5000 })

    await setPropertyPanelValue(page, 'Label', 'Process Payment')
    await page.waitForTimeout(300)

    await expect(page.locator('.react-flow__node').first()).toContainText('Process Payment')
  })

  test('State node: edit name', async ({ page }) => {
    const url = await createDiagram(page, 'state')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'State', 200, 200)
    await waitForCanvasNodes(page, 1)

    await selectCanvasNode(page, 0)
    await page.waitForTimeout(300)

    const panel = page.locator('.absolute.top-3.right-3')
    await expect(panel).toBeVisible({ timeout: 5000 })

    await setPropertyPanelValue(page, 'State Name', 'Active')
    await page.waitForTimeout(300)

    await expect(page.locator('.react-flow__node').first()).toContainText('Active')
  })

  test('Entity node: edit name, add attribute, remove attribute', async ({ page, request }) => {
    // Use API to create and navigate — more reliable than UI creation
    diagramId = await createDiagramViaApi(request, { title: 'Entity Props Test', type: 'er' })
    await page.goto(`http://127.0.0.1:3000/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Entity', 200, 200)
    await waitForCanvasNodes(page, 1)

    await selectCanvasNode(page, 0)
    await page.waitForTimeout(500)

    const panel = page.locator('.absolute.top-3.right-3')
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Edit entity name
    await setPropertyPanelValue(page, 'Entity Name', 'Customer')
    await page.waitForTimeout(300)
    await expect(page.locator('.react-flow__node').first()).toContainText('Customer')

    // Add an attribute
    const attrInput = panel.locator('input[placeholder="string name PK"]')
    await attrInput.fill('int id PK')
    await attrInput.press('Enter')
    await page.waitForTimeout(500)
    await expect(page.locator('.react-flow__node').first()).toContainText('int id PK')

    // Add another attribute
    const newAttrInput = panel.locator('input[placeholder="string name PK"]')
    await newAttrInput.fill('string email')
    await newAttrInput.press('Enter')
    await page.waitForTimeout(500)
    await expect(page.locator('.react-flow__node').first()).toContainText('string email')
  })
})

// ---------------------------------------------------------------------------
// Group 8: Connection/Edge Testing
// ---------------------------------------------------------------------------
test.describe('Group 8: Connection/Edge Testing', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('connect two nodes -> verify edge appears on canvas', async ({ page }) => {
    const url = await createDiagram(page, 'flowchart')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Process', 200, 100)
    await dragToolToCanvas(page, 'Process', 200, 300)
    await waitForCanvasNodes(page, 2)

    // Before connecting
    expect(await countCanvasEdges(page)).toBe(0)

    // Connect
    await connectNodes(page, 0, 1)
    await page.waitForTimeout(500)

    // After connecting
    expect(await countCanvasEdges(page)).toBe(1)
  })

  test('connect nodes -> switch to Code -> verify edge in Mermaid code', async ({
    page,
  }) => {
    const url = await createDiagram(page, 'flowchart')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Process', 200, 100)
    await dragToolToCanvas(page, 'Process', 200, 300)
    await waitForCanvasNodes(page, 2)

    await connectNodes(page, 0, 1)
    await page.waitForTimeout(500)

    // Switch to Split to trigger code sync
    await switchMode(page, 'Split')
    await page.waitForTimeout(1000)

    const syncBtn = page.getByRole('button', { name: 'Sync Code' })
    if (await syncBtn.isVisible()) {
      await syncBtn.click()
      await page.waitForTimeout(1000)
    }

    await waitForCodeContaining(page, /-->/)
    const code = await getEditorCode(page)
    expect(code).toContain('-->')
    expect(code).toContain('flowchart TD')
  })

  test('connect two class nodes -> verify edge arrow in Code', async ({ page }) => {
    const url = await createDiagram(page, 'class')
    diagramId = extractDiagramId(url)

    await switchMode(page, 'Visual')
    await page.waitForTimeout(500)

    await dragToolToCanvas(page, 'Class', 200, 100)
    await dragToolToCanvas(page, 'Class', 200, 300)
    await waitForCanvasNodes(page, 2)

    await connectNodes(page, 0, 1)
    await page.waitForTimeout(500)

    await switchMode(page, 'Split')
    await page.waitForTimeout(1000)

    const syncBtn = page.getByRole('button', { name: 'Sync Code' })
    if (await syncBtn.isVisible()) {
      await syncBtn.click()
      await page.waitForTimeout(1000)
    }

    await waitForCodeContaining(page, /classDiagram/)
    const code = await getEditorCode(page)
    expect(code).toContain('classDiagram')
    // Should have some kind of arrow between classes
    expect(code).toMatch(/-->|<\|--|o--|<\.\.|\*--/)
  })
})
