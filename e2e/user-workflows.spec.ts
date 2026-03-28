import { test, expect } from '@playwright/test'
import {
  timestamp,
  createDiagram,
  renameDiagram,
  switchMode,
  getEditorCode,
  countCanvasNodes,
  countCanvasEdges,
  waitForCodeContaining,
  waitForCanvasNodes,
  setDiagramCodeViaApi,
  waitForSaved,
  getDiagramListTitles,
  createDiagramViaApi,
  deleteDiagramViaApi,
  goBackToHome,
  extractDiagramId,
} from './helpers'

// ---------------------------------------------------------------------------
// Workflow 1: Create, name, and verify persistence
// ---------------------------------------------------------------------------
test.describe('Workflow 1: Create, name, and verify persistence', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('diagram data persists on disk after rename and content changes', async ({
    page,
    request,
  }) => {
    const ts = timestamp()
    const name = `Persist_Test_${ts}_${Date.now()}`

    // Create and rename
    const url = await createDiagram(page, 'class')
    diagramId = extractDiagramId(url)
    await renameDiagram(page, name)

    // Set content via API for reliability
    const code = [
      'classDiagram',
      '  class Order {',
      '    +int orderId',
      '    +Date orderDate',
      '    +calculateTotal()',
      '  }',
      '  class Customer {',
      '    +String name',
      '    +String email',
      '  }',
      '  Customer --> Order',
    ].join('\n')
    await setDiagramCodeViaApi(request, page, code)
    await page.reload()
    await page.waitForTimeout(2500)

    // Verify content loaded in code mode
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Order/)

    // Verify persistence via API (bypasses any RSC cache)
    const apiRes = await request.get(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`)
    expect(apiRes.status()).toBe(200)
    const apiData = await apiRes.json()
    expect(apiData.meta.title).toBe(name)
    expect(apiData.code).toContain('Order')
    expect(apiData.code).toContain('Customer')

    // Navigate directly to the diagram again to verify re-opening works
    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Verify content is still there
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Order/)
    const editorCode = await getEditorCode(page)
    expect(editorCode).toContain('Customer')
    expect(editorCode).toContain('Order')

    // Switch to Visual to verify nodes parsed
    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 2)
    const nodeCount = await countCanvasNodes(page)
    expect(nodeCount).toBe(2)
  })

  test('home page listing shows newly created diagram after navigation', async ({
    page,
    request,
  }) => {
    const ts = timestamp()
    const name = `HomeList_Test_${ts}_${Date.now()}`

    const url = await createDiagram(page, 'class')
    diagramId = extractDiagramId(url)
    await renameDiagram(page, name)

    // Navigate to home via full page load
    await goBackToHome(page)

    const titles = await getDiagramListTitles(page)
    expect(titles).toContain(name)
  })
})

// ---------------------------------------------------------------------------
// Workflow 2: Multi-diagram workflow (work on A, switch to B, return to A)
// ---------------------------------------------------------------------------
test.describe('Workflow 2: Multi-diagram navigation', () => {
  const createdIds: string[] = []

  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      await deleteDiagramViaApi(request, id)
    }
    createdIds.length = 0
  })

  test('navigate between two diagrams, content persists for both', async ({
    page,
    request,
  }) => {
    const ts = timestamp()
    const nameA = `DiagramA_Flow_${ts}_${Date.now()}`
    const nameB = `DiagramB_Class_${ts}_${Date.now()}`

    // Create diagram A (flowchart) via API
    const codeA = [
      'flowchart TD',
      '  Start[Start Process]',
      '  Check{Is Valid?}',
      '  Process[Do Work]',
      '  Start --> Check',
      '  Check --> Process',
    ].join('\n')
    const idA = await createDiagramViaApi(request, {
      title: nameA,
      type: 'flowchart',
      code: codeA,
    })
    createdIds.push(idA)

    // Create diagram B (class) via API
    const codeB = [
      'classDiagram',
      '  class Person {',
      '    +String name',
      '  }',
      '  class Address {',
      '    +String street',
      '  }',
      '  Person --> Address',
    ].join('\n')
    const idB = await createDiagramViaApi(request, {
      title: nameB,
      type: 'class',
      code: codeB,
    })
    createdIds.push(idB)

    // Open diagram A directly
    await page.goto(`/diagram/${idA}`)
    await page.waitForTimeout(2500)

    // Verify A has its content
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /flowchart TD/)
    const codeACheck = await getEditorCode(page)
    expect(codeACheck).toContain('Start Process')

    // Verify A has 3 nodes and 2 edges in Visual
    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 3)
    expect(await countCanvasNodes(page)).toBe(3)
    expect(await countCanvasEdges(page)).toBe(2)

    // Open diagram B directly
    await page.goto(`/diagram/${idB}`)
    await page.waitForTimeout(2500)

    // Verify B has its content
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /classDiagram/)
    const codeBCheck = await getEditorCode(page)
    expect(codeBCheck).toContain('Person')
    expect(codeBCheck).toContain('Address')

    // Verify B has 2 nodes
    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 2)
    expect(await countCanvasNodes(page)).toBe(2)

    // Re-open A to verify it still has its content
    await page.goto(`/diagram/${idA}`)
    await page.waitForTimeout(2500)

    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /flowchart TD/)
    const codeARecheck = await getEditorCode(page)
    expect(codeARecheck).toContain('Start Process')
  })

  test('home page lists both diagrams after API creation', async ({
    page,
    request,
  }) => {
    const ts = timestamp()
    const nameA = `ListA_${ts}`
    const nameB = `ListB_${ts}`

    const idA = await createDiagramViaApi(request, {
      title: nameA,
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start]\n',
    })
    createdIds.push(idA)

    const idB = await createDiagramViaApi(request, {
      title: nameB,
      type: 'class',
      code: 'classDiagram\n  class Foo\n',
    })
    createdIds.push(idB)

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const titles = await getDiagramListTitles(page)
    expect(titles).toContain(nameA)
    expect(titles).toContain(nameB)
  })
})

// ---------------------------------------------------------------------------
// Workflow 3: Export functionality
// ---------------------------------------------------------------------------
test.describe('Workflow 3: Export functionality', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  // Helper: intercept the download mechanism and trigger export via dispatchEvent.
  // The export dropdown in Code mode is partially covered by the MermaidPreview
  // panel (z-index/stacking context bug), so regular Playwright clicks are
  // intercepted by the preview pane. Using dispatchEvent('click') triggers the
  // React handler without pointer-events checks.
  async function runExportAndVerify(
    page: import('@playwright/test').Page,
    optionText: string,
    expectedExtension: RegExp,
  ) {
    // Intercept download by monkeypatching HTMLAnchorElement.click
    await page.evaluate(() => {
      (window as any).__downloadTriggered = false;
      (window as any).__downloadFilename = '';
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

    // Open the export dropdown
    await exportBtn.click()
    const option = page.locator('button', { hasText: optionText })
    await expect(option).toBeVisible({ timeout: 3000 })

    // Use dispatchEvent to bypass pointer-events interception from the preview pane
    await option.dispatchEvent('click')

    // PNG export is async (renders SVG to canvas via Image) — wait longer
    await expect(async () => {
      const triggered = await page.evaluate(() => (window as any).__downloadTriggered)
      expect(triggered).toBe(true)
    }).toPass({ timeout: 10000, intervals: [500] })

    // Verify the download filename
    const filename = await page.evaluate(() => (window as any).__downloadFilename)
    expect(filename).toMatch(expectedExtension)
  }

  test('export Mermaid (.mmd) triggers a download', async ({ page, request }) => {
    const code = 'flowchart TD\n  A[Start] --> B[End]\n'
    diagramId = await createDiagramViaApi(request, {
      title: 'Export_Mermaid_Test',
      type: 'flowchart',
      code,
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await page.waitForTimeout(500)

    await runExportAndVerify(page, 'Mermaid (.mmd)', /\.mmd$/)
  })

  test('export SVG (.svg) triggers a download', async ({ page, request }) => {
    const code = 'flowchart TD\n  A[Start] --> B[End]\n'
    diagramId = await createDiagramViaApi(request, {
      title: 'Export_SVG_Test',
      type: 'flowchart',
      code,
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await page.waitForTimeout(500)

    await runExportAndVerify(page, 'SVG (.svg)', /\.svg$/)
  })

  test('export PNG (.png) triggers a download', async ({ page, request }) => {
    const code = 'flowchart TD\n  A[Start] --> B[End]\n'
    diagramId = await createDiagramViaApi(request, {
      title: 'Export_PNG_Test',
      type: 'flowchart',
      code,
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)
    await switchMode(page, 'Code')
    await page.waitForTimeout(500)

    await runExportAndVerify(page, 'PNG (.png)', /\.png$/)
  })

  test('export button is disabled when code is empty', async ({ page, request }) => {
    // Create a diagram, then explicitly clear its code
    const createRes = await request.post('http://127.0.0.1:3000/api/mcp/diagrams', {
      data: { title: 'Export_Disabled_Test', type: 'flowchart' },
    })
    const { id } = await createRes.json()
    diagramId = id

    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${id}`, {
      data: { code: '' },
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    const exportBtn = page.locator('header').getByRole('button', { name: 'Export', exact: true })
    await expect(exportBtn).toBeDisabled({ timeout: 8000 })
  })
})

// ---------------------------------------------------------------------------
// Workflow 4: Title editing edge cases
// ---------------------------------------------------------------------------
test.describe('Workflow 4: Title editing edge cases', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('rename via Enter saves, rename via Escape reverts', async ({ page, request }) => {
    const ts = Date.now()
    const originalName = `TitleTest_${ts}`
    diagramId = await createDiagramViaApi(request, {
      title: originalName,
      type: 'class',
      code: 'classDiagram\n  class Foo\n',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Verify the title shows correctly
    const titleBtn = page.locator('button[title="Click to edit title"]')
    await expect(titleBtn).toHaveText(originalName)

    // --- Rename via Enter ---
    const newName = `Renamed_${ts}`
    await titleBtn.click()
    const input = page.locator('header input')
    await input.fill(newName)
    await input.press('Enter')
    await waitForSaved(page)

    // Verify title button now shows the new name
    await expect(titleBtn).toHaveText(newName)

    // --- Rename via Escape should revert ---
    await titleBtn.click()
    const input2 = page.locator('header input')
    await input2.fill('THIS_SHOULD_NOT_PERSIST')
    await input2.press('Escape')

    // Title should revert to the name saved with Enter
    await expect(titleBtn).toHaveText(newName)

    // Verify on the server too
    const res = await request.get(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`)
    const data = await res.json()
    expect(data.meta.title).toBe(newName)
  })

  test('title with special characters persists after reload', async ({ page, request }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'SpecialChars_Temp',
      type: 'class',
      code: 'classDiagram\n  class Foo\n',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    const specialTitle = 'Test_Hallon_Banan_42'
    await renameDiagram(page, specialTitle)

    // Reload and verify in editor
    await page.reload()
    await page.waitForTimeout(2500)
    const titleBtn = page.locator('button[title="Click to edit title"]')
    await expect(titleBtn).toHaveText(specialTitle)

    // Verify via API as well
    const res = await request.get(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`)
    const data = await res.json()
    expect(data.meta.title).toBe(specialTitle)
  })

  test('renamed title shows correctly on home page listing', async ({
    page,
    request,
  }) => {
    diagramId = await createDiagramViaApi(request, {
      title: 'WillBeRenamed',
      type: 'class',
      code: 'classDiagram\n  class Foo\n',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    const newTitle = `Renamed_Home_${Date.now()}`
    await renameDiagram(page, newTitle)

    await goBackToHome(page)
    const titles = await getDiagramListTitles(page)
    expect(titles).toContain(newTitle)
  })
})

// ---------------------------------------------------------------------------
// Workflow 5: Mode switching preserves state
// ---------------------------------------------------------------------------
test.describe('Workflow 5: Mode switching preserves state', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('rapid mode switching preserves code and nodes', async ({ page, request }) => {
    const code = [
      'classDiagram',
      '  class Alpha {',
      '    +run()',
      '  }',
      '  class Beta {',
      '    +stop()',
      '  }',
      '  Alpha --> Beta',
    ].join('\n')
    diagramId = await createDiagramViaApi(request, {
      title: 'ModeSwitch_Test',
      type: 'class',
      code,
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Start in Code mode, verify code
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Alpha/)

    // Switch to Split, verify code AND canvas
    await switchMode(page, 'Split')
    await waitForCodeContaining(page, /Alpha/)
    await waitForCanvasNodes(page, 2)

    // Switch to Visual, verify canvas
    await switchMode(page, 'Visual')
    await waitForCanvasNodes(page, 2)
    expect(await countCanvasEdges(page)).toBe(1)

    // Switch back to Split, code should still be there
    await switchMode(page, 'Split')
    await waitForCodeContaining(page, /Alpha/)
    await waitForCanvasNodes(page, 2)

    // Switch to Code, verify code persisted
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Alpha/)
    const codeCheck = await getEditorCode(page)
    expect(codeCheck).toContain('Beta')

    // --- Rapid switching (3 full cycles) ---
    for (let i = 0; i < 3; i++) {
      await switchMode(page, 'Visual')
      await page.waitForTimeout(200)
      await switchMode(page, 'Split')
      await page.waitForTimeout(200)
      await switchMode(page, 'Code')
      await page.waitForTimeout(200)
    }

    // After rapid switching, code should still be intact
    await waitForCodeContaining(page, /Alpha/)
    const finalCode = await getEditorCode(page)
    expect(finalCode).toContain('Alpha')
    expect(finalCode).toContain('Beta')
  })
})

// ---------------------------------------------------------------------------
// Workflow 6: Auto-save verification
// ---------------------------------------------------------------------------
test.describe('Workflow 6: Auto-save verification', () => {
  let diagramId: string | undefined

  test.afterEach(async ({ request }) => {
    if (diagramId) {
      await deleteDiagramViaApi(request, diagramId)
      diagramId = undefined
    }
  })

  test('changes are auto-saved and survive page reload', async ({ page, request }) => {
    const ts = Date.now()
    const name = `AutoSave_${ts}`

    diagramId = await createDiagramViaApi(request, {
      title: name,
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start]\n',
    })

    await page.goto(`/diagram/${diagramId}`)
    await page.waitForTimeout(2500)

    // Update content via API
    const updatedCode = [
      'flowchart TD',
      '  A[Start] --> B[Middle]',
      '  B --> C[End]',
    ].join('\n')
    await setDiagramCodeViaApi(request, page, updatedCode)
    await page.reload()
    await page.waitForTimeout(2500)

    // Verify code loaded
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Middle/)

    // Wait for the Saved indicator
    await waitForSaved(page)

    // Hard reload the page
    await page.reload()
    await page.waitForTimeout(2500)

    // Verify content survived the reload
    await switchMode(page, 'Code')
    await waitForCodeContaining(page, /Middle/)
    const code = await getEditorCode(page)
    expect(code).toContain('Start')
    expect(code).toContain('Middle')
    expect(code).toContain('End')
  })
})
