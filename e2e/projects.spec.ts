import { test, expect } from '@playwright/test'
import {
  createDiagramViaApi,
  deleteDiagramViaApi,
  createProjectViaApi,
  deleteProjectViaApi,
  addDiagramToProjectViaApi,
  getProjectItemsViaApi,
  removeDiagramFromProjectViaApi,
  reorderProjectItemsViaApi,
  goBackToHome,
} from './helpers'

// ---------------------------------------------------------------------------
// Projects Feature
// ---------------------------------------------------------------------------
test.describe('Projects', () => {
  // Track created resources for cleanup
  let projectIds: string[] = []
  let diagramIds: string[] = []

  test.afterEach(async ({ request }) => {
    // Clean up projects first (removing associations), then diagrams
    for (const pid of projectIds) {
      await deleteProjectViaApi(request, pid).catch(() => {})
    }
    for (const did of diagramIds) {
      await deleteDiagramViaApi(request, did).catch(() => {})
    }
    projectIds = []
    diagramIds = []
  })

  // -------------------------------------------------------------------------
  // 1. Home page shows Projects section
  // -------------------------------------------------------------------------
  test('home page shows New Project button', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const newProjectBtn = page.getByRole('button', { name: 'New Project' })
    await expect(newProjectBtn).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 2. Create project — create via API, verify on home page
  // -------------------------------------------------------------------------
  test('create project via API and verify on home page', async ({ page, request }) => {
    const title = `E2E Project ${Date.now()}`
    const projectId = await createProjectViaApi(request, title)
    projectIds.push(projectId)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The "Projects" section heading should appear
    await expect(page.getByText('Projects', { exact: true })).toBeVisible()

    // The project card should show the title
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // Should show "0 diagrams" since it's empty
    await expect(page.getByText('0 diagrams').first()).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 3. Project detail page loads
  // -------------------------------------------------------------------------
  test('project detail page loads with correct title', async ({ page, request }) => {
    const title = `Detail Page Test ${Date.now()}`
    const projectId = await createProjectViaApi(request, title)
    projectIds.push(projectId)

    await page.goto(`/project/${projectId}`)
    await page.waitForLoadState('networkidle')

    // Title should be visible as a button (editable title)
    await expect(page.getByRole('button', { name: title })).toBeVisible()

    // Should show "0 diagrams"
    await expect(page.getByText('0 diagrams')).toBeVisible()

    // "Add Diagram" button should be present
    await expect(page.getByRole('button', { name: 'Add Diagram' })).toBeVisible()

    // Back link should point to home
    const backLink = page.getByRole('link', { name: 'Back' })
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute('href', '/')
  })

  // -------------------------------------------------------------------------
  // 4. Add diagram to project
  // -------------------------------------------------------------------------
  test('add diagram to project via API and verify listing', async ({ page, request }) => {
    const projectId = await createProjectViaApi(request, `Add Diagram Test ${Date.now()}`)
    projectIds.push(projectId)

    const diagramId = await createDiagramViaApi(request, {
      title: 'Test Flowchart',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })
    diagramIds.push(diagramId)

    await addDiagramToProjectViaApi(request, projectId, diagramId)

    await page.goto(`/project/${projectId}`)
    await page.waitForLoadState('networkidle')

    // Diagram should appear in the list
    await expect(page.getByText('Test Flowchart')).toBeVisible()

    // Should show "1 diagram"
    await expect(page.getByText('1 diagram')).toBeVisible()

    // The diagram link should point to the editor
    const diagramLink = page.getByRole('link', { name: /Test Flowchart/ })
    await expect(diagramLink).toHaveAttribute('href', `/diagram/${diagramId}`)
  })

  // -------------------------------------------------------------------------
  // 5. Remove diagram from project
  // -------------------------------------------------------------------------
  test('remove diagram from project', async ({ page, request }) => {
    const projectId = await createProjectViaApi(request, `Remove Test ${Date.now()}`)
    projectIds.push(projectId)

    const diagramId = await createDiagramViaApi(request, {
      title: 'To Be Removed',
      type: 'flowchart',
    })
    diagramIds.push(diagramId)

    await addDiagramToProjectViaApi(request, projectId, diagramId)

    await page.goto(`/project/${projectId}`)
    await page.waitForLoadState('networkidle')

    // Verify diagram is listed
    await expect(page.getByText('To Be Removed')).toBeVisible()

    // Click the remove button (visible on hover)
    const removeBtn = page.getByRole('button', { name: 'Remove from project' })
    await removeBtn.click({ force: true })

    // Diagram should disappear from the list
    await expect(page.getByText('To Be Removed')).not.toBeVisible()

    // Should show "No diagrams yet"
    await expect(page.getByText('No diagrams yet')).toBeVisible()

    // Verify via API that items are empty
    const items = await getProjectItemsViaApi(request, projectId)
    expect(items).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // 6. Reorder items
  // -------------------------------------------------------------------------
  test('reorder items via API and verify order persists', async ({ page, request }) => {
    const projectId = await createProjectViaApi(request, `Reorder Test ${Date.now()}`)
    projectIds.push(projectId)

    const diagramA = await createDiagramViaApi(request, {
      title: 'Diagram Alpha',
      type: 'flowchart',
    })
    diagramIds.push(diagramA)

    const diagramB = await createDiagramViaApi(request, {
      title: 'Diagram Beta',
      type: 'class',
    })
    diagramIds.push(diagramB)

    await addDiagramToProjectViaApi(request, projectId, diagramA)
    await addDiagramToProjectViaApi(request, projectId, diagramB)

    // Verify initial order: Alpha (0), Beta (1)
    let items = await getProjectItemsViaApi(request, projectId)
    expect(items[0].title).toBe('Diagram Alpha')
    expect(items[1].title).toBe('Diagram Beta')

    // Reorder: swap to Beta (0), Alpha (1)
    await reorderProjectItemsViaApi(request, projectId, [
      { diagramId: diagramB, order: 0 },
      { diagramId: diagramA, order: 1 },
    ])

    // Navigate to project page to verify visual order
    await page.goto(`/project/${projectId}`)
    await page.waitForLoadState('networkidle')

    // Get all diagram titles in order
    const titles = await page.locator('p.font-medium').allTextContents()
    expect(titles[0]).toBe('Diagram Beta')
    expect(titles[1]).toBe('Diagram Alpha')

    // Reload and verify order persists
    await page.reload()
    await page.waitForLoadState('networkidle')

    const titlesAfterReload = await page.locator('p.font-medium').allTextContents()
    expect(titlesAfterReload[0]).toBe('Diagram Beta')
    expect(titlesAfterReload[1]).toBe('Diagram Alpha')
  })

  // -------------------------------------------------------------------------
  // 7. Merged export
  // -------------------------------------------------------------------------
  test('merged export downloads a markdown file', async ({ page, request }) => {
    const projectTitle = `Export Test ${Date.now()}`
    const projectId = await createProjectViaApi(request, projectTitle)
    projectIds.push(projectId)

    const diagram1 = await createDiagramViaApi(request, {
      title: 'Export Diagram 1',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Hello] --> B[World]',
    })
    diagramIds.push(diagram1)

    const diagram2 = await createDiagramViaApi(request, {
      title: 'Export Diagram 2',
      type: 'class',
      code: 'classDiagram\n  class Animal',
    })
    diagramIds.push(diagram2)

    await addDiagramToProjectViaApi(request, projectId, diagram1)
    await addDiagramToProjectViaApi(request, projectId, diagram2)

    await page.goto(`/project/${projectId}`)
    await page.waitForLoadState('networkidle')

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export Merged' }).click()
    const download = await downloadPromise

    // Verify it's a markdown file
    expect(download.suggestedFilename()).toMatch(/\.md$/)

    // Read the downloaded content
    const content = (await download.path())
      ? await (await import('fs')).promises.readFile((await download.path())!, 'utf-8')
      : ''

    // Should contain the project title as heading
    expect(content).toContain(`# ${projectTitle}`)

    // Should contain both diagram titles
    expect(content).toContain('## Export Diagram 1')
    expect(content).toContain('## Export Diagram 2')

    // Should contain mermaid code blocks
    expect(content).toContain('```mermaid')
    expect(content).toContain('flowchart TD')
    expect(content).toContain('classDiagram')
  })

  // -------------------------------------------------------------------------
  // 8. Breadcrumb in editor
  // -------------------------------------------------------------------------
  test('editor shows project breadcrumb and links back to project', async ({
    page,
    request,
  }) => {
    const projectTitle = `Breadcrumb Test ${Date.now()}`
    const projectId = await createProjectViaApi(request, projectTitle)
    projectIds.push(projectId)

    const diagramId = await createDiagramViaApi(request, {
      title: 'Breadcrumb Diagram',
      type: 'flowchart',
      code: 'flowchart TD\n  A --> B',
    })
    diagramIds.push(diagramId)

    await addDiagramToProjectViaApi(request, projectId, diagramId)

    // Navigate to the diagram editor
    await page.goto(`/diagram/${diagramId}`)
    await page.waitForLoadState('networkidle')
    // Allow Yjs to initialise
    await page.waitForTimeout(2000)

    // The back link should show the project title (not "Back")
    const backLink = page.getByRole('link', { name: projectTitle })
    await expect(backLink).toBeVisible()

    // It should link to the project page
    await expect(backLink).toHaveAttribute('href', `/project/${projectId}`)

    // Click the breadcrumb to go back
    await backLink.click()
    await page.waitForURL(`/project/${projectId}`)

    // We should be on the project page
    await expect(page.getByRole('button', { name: projectTitle })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 9. Ungrouped diagrams
  // -------------------------------------------------------------------------
  test('diagram not in project shows in Ungrouped section', async ({ page, request }) => {
    // Create a project so the "Ungrouped" section appears
    const projectId = await createProjectViaApi(request, `Group Test ${Date.now()}`)
    projectIds.push(projectId)

    // Create a diagram that is NOT added to any project
    const ungroupedDiagram = await createDiagramViaApi(request, {
      title: `Ungrouped Diagram ${Date.now()}`,
      type: 'flowchart',
    })
    diagramIds.push(ungroupedDiagram)

    // Create a grouped diagram
    const groupedDiagram = await createDiagramViaApi(request, {
      title: `Grouped Diagram ${Date.now()}`,
      type: 'class',
    })
    diagramIds.push(groupedDiagram)

    await addDiagramToProjectViaApi(request, projectId, groupedDiagram)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // "Ungrouped Diagrams" heading should exist
    await expect(page.getByText('Ungrouped Diagrams')).toBeVisible()

    // The ungrouped diagram should appear somewhere on the page (use h3 to avoid matching h2 section heading)
    await expect(
      page.locator('h3', { hasText: /Ungrouped Diagram/ }),
    ).toBeVisible()

    // The grouped diagram should NOT appear in the ungrouped section
    // (it's in the project, so it won't have its own card in ungrouped)
    await expect(
      page.locator('h3', { hasText: /Grouped Diagram/ }),
    ).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 10. Delete project — diagrams survive
  // -------------------------------------------------------------------------
  test('delete project does not delete diagrams', async ({ page, request }) => {
    const projectId = await createProjectViaApi(request, `Delete Test ${Date.now()}`)
    // Don't push to projectIds since we'll delete it manually

    const diagramId = await createDiagramViaApi(request, {
      title: `Survivor Diagram ${Date.now()}`,
      type: 'flowchart',
      code: 'flowchart TD\n  A --> B',
    })
    diagramIds.push(diagramId)

    await addDiagramToProjectViaApi(request, projectId, diagramId)

    // Delete the project
    await deleteProjectViaApi(request, projectId)

    // Verify diagram still exists via API
    const res = await request.get(`http://127.0.0.1:3000/api/mcp/diagrams/${diagramId}`)
    expect(res.status()).toBe(200)
    const diagram = await res.json()
    expect(diagram.meta.title).toContain('Survivor Diagram')

    // Navigate to home — diagram should appear (ungrouped now)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /Survivor Diagram/ })).toBeVisible()
  })
})
