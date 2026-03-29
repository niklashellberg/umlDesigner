import { test, expect } from '@playwright/test'
import {
  createDiagram,
  createDiagramViaApi,
  switchMode,
  switchToDocsTab,
  switchToCodeTab,
  waitForCodeContaining,
  waitForSaved,
  getEditorCode,
} from './helpers'

// ---------------------------------------------------------------------------
// Markdown Documentation Feature
// ---------------------------------------------------------------------------
test.describe('Markdown Documentation', () => {
  test('Code and Docs tabs are visible in Split mode', async ({ page }) => {
    await createDiagram(page, 'flowchart')

    const codeTab = page.getByRole('button', { name: 'Code', exact: true }).first()
    const docsTab = page.getByRole('button', { name: 'Docs', exact: true })

    await expect(codeTab).toBeVisible()
    await expect(docsTab).toBeVisible()

    await expect(page.locator('.monaco-editor')).toBeVisible()
    await waitForCodeContaining(page, /flowchart/)
  })

  test('Switching to Docs tab shows markdown editor', async ({ page }) => {
    await createDiagram(page, 'flowchart')
    await waitForCodeContaining(page, /flowchart/)

    await switchToDocsTab(page)

    // Docs tab shows Edit/Preview toggle and a textarea (not Monaco)
    const editBtn = page.getByRole('button', { name: 'Edit', exact: true })
    const previewBtn = page.getByRole('button', { name: 'Preview', exact: true })
    await expect(editBtn).toBeVisible()
    await expect(previewBtn).toBeVisible()

    // Textarea should be visible
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
  })

  test('Markdown content persists via API', async ({ page, request }) => {
    const id = await createDiagramViaApi(request, {
      title: 'MD API Test',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })

    const mdContent = '# Test Doc\n\nSome description'
    const res = await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${id}`, {
      data: { markdown: mdContent },
    })
    expect(res.status()).toBe(200)

    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    await switchToDocsTab(page)
    await page.waitForTimeout(1000)

    // Textarea should contain the markdown content
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveValue(/Test Doc/)
  })

  test('Markdown survives page reload', async ({ page, request }) => {
    const id = await createDiagramViaApi(request, {
      title: 'Reload MD Test',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })
    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    await switchToDocsTab(page)
    await page.waitForTimeout(500)

    // Type markdown content in textarea
    const textarea = page.locator('textarea')
    await textarea.click()
    await textarea.fill('# Reload Test Doc\nContent survives reload.')

    // Wait for auto-save
    await waitForSaved(page, 15000)
    await page.waitForTimeout(2000)

    // Reload
    await page.reload()
    await page.waitForTimeout(2500)

    await switchToDocsTab(page)
    await page.waitForTimeout(1000)

    // Verify content survived
    const reloadedTextarea = page.locator('textarea')
    await expect(reloadedTextarea).toHaveValue(/Reload Test Doc/)
    await expect(reloadedTextarea).toHaveValue(/Content survives reload/)
  })

  test('Switching between Code/Docs tabs preserves both', async ({ page, request }) => {
    const mermaidCode = 'flowchart TD\n  A[Start] --> B[Process] --> C[End]'
    const id = await createDiagramViaApi(request, {
      title: 'Tab Switch Test',
      type: 'flowchart',
      code: mermaidCode,
    })

    const mdContent = '# Architecture Notes\n\nImportant details here.'
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${id}`, {
      data: { markdown: mdContent },
    })

    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    // Verify code is visible (Code tab is default)
    await waitForCodeContaining(page, /flowchart/)

    // Switch to Docs tab — verify markdown visible
    await switchToDocsTab(page)
    await page.waitForTimeout(1000)
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue(/Architecture Notes/)

    // Switch back to Code tab — verify code STILL there
    await switchToCodeTab(page)
    await page.waitForTimeout(1000)
    await expect(async () => {
      const code = await getEditorCode(page)
      expect(code).toContain('flowchart')
    }).toPass({ timeout: 10000, intervals: [500] })

    // Switch to Docs again — verify markdown STILL there
    await switchToDocsTab(page)
    await page.waitForTimeout(1000)
    await expect(page.locator('textarea')).toHaveValue(/Architecture Notes/)
  })

  test('Export Markdown Doc triggers download', async ({ page, request }) => {
    const id = await createDiagramViaApi(request, {
      title: 'Export MD Test',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${id}`, {
      data: { markdown: '# Export Test\n\nSome docs.' },
    })

    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    const exportBtn = page.getByRole('button', { name: 'Export', exact: true })
    await exportBtn.click()
    await page.waitForTimeout(300)

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.getByText('Markdown Doc (.md)').click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.md$/)
  })

  test('Mermaid preview visible when Docs tab active in Code mode', async ({ page, request }) => {
    const id = await createDiagramViaApi(request, {
      title: 'Preview Check',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })

    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    await switchMode(page, 'Code')
    await page.waitForTimeout(500)

    await switchToDocsTab(page)
    await page.waitForTimeout(500)

    // Preview panel should still show Mermaid SVG
    const svgInPreview = page.locator('[id^="mermaid-"], .overflow-auto svg, .mermaid svg')
    await expect(svgInPreview.first()).toBeVisible({ timeout: 5000 })
  })
})
