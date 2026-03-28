import { test, expect } from '@playwright/test'
import {
  createDiagram,
  createDiagramViaApi,
  switchMode,
  switchToDocsTab,
  switchToCodeTab,
  setDiagramMarkdownViaApi,
  setDiagramCodeViaApi,
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

    // Default mode is Split — tabs should be visible
    const codeTab = page.getByRole('button', { name: 'Code', exact: true }).first()
    const docsTab = page.getByRole('button', { name: 'Docs', exact: true })

    await expect(codeTab).toBeVisible()
    await expect(docsTab).toBeVisible()

    // Code tab should be active by default — Mermaid code visible
    await expect(page.locator('.monaco-editor')).toBeVisible()
    await waitForCodeContaining(page, /flowchart/)
  })

  test('Switching to Docs tab shows markdown editor', async ({ page }) => {
    await createDiagram(page, 'flowchart')

    // Verify Mermaid code is showing first
    await waitForCodeContaining(page, /flowchart/)

    // Switch to Docs tab
    await switchToDocsTab(page)

    // Mermaid code should no longer be visible in the left panel editor.
    // The Docs tab replaces the code editor with a markdown editor.
    // We check that a Monaco editor is still present (markdown uses Monaco too),
    // but the flowchart keyword should not appear (that was the code editor).
    // Instead, look for the Edit/Preview toggle which is unique to MarkdownEditor.
    const editBtn = page.getByRole('button', { name: 'Edit', exact: true })
    const previewBtn = page.getByRole('button', { name: 'Preview', exact: true })
    await expect(editBtn).toBeVisible()
    await expect(previewBtn).toBeVisible()
  })

  test('Markdown content persists via API', async ({ page, request }) => {
    // Create a diagram via API
    const id = await createDiagramViaApi(request, {
      title: 'MD API Test',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })

    // Set markdown via PUT API
    const mdContent = '# Test Doc\n\nSome description'
    const res = await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${id}`, {
      data: { markdown: mdContent },
    })
    expect(res.status()).toBe(200)

    // Navigate to the diagram
    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    // Switch to Docs tab
    await switchToDocsTab(page)
    await page.waitForTimeout(1000)

    // The markdown content should be visible in the editor.
    // Monaco renders content in .view-lines; check for our text.
    await expect(async () => {
      const text = await page.evaluate(() => {
        const lines = document.querySelectorAll('.monaco-editor .view-lines .view-line')
        return Array.from(lines).map((l) => l.textContent ?? '').join('\n')
      })
      const normalised = text.replace(/\u00a0/g, ' ')
      expect(normalised).toContain('Test Doc')
    }).toPass({ timeout: 8000, intervals: [500] })
  })

  test('Markdown survives page reload', async ({ page, request }) => {
    // Create diagram and navigate to it
    const id = await createDiagramViaApi(request, {
      title: 'Reload MD Test',
      type: 'flowchart',
      code: 'flowchart TD\n  A[Start] --> B[End]',
    })
    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    // Switch to Docs tab and type markdown content
    await switchToDocsTab(page)
    await page.waitForTimeout(500)

    const editor = page.locator('.monaco-editor')
    await editor.waitFor({ state: 'visible' })
    const viewLines = page.locator('.monaco-editor .view-lines')
    await viewLines.click()
    await page.waitForTimeout(300)

    // Type content character by character (delay helps Yjs capture spaces)
    await page.keyboard.type('# Reload Test Doc', { delay: 30 })
    await page.keyboard.press('Enter')
    await page.keyboard.type('Content survives reload.', { delay: 30 })

    // Wait for auto-save
    await waitForSaved(page, 15000)

    // Give extra time for the save to fully persist to disk
    await page.waitForTimeout(2000)

    // Reload the page
    await page.reload()
    await page.waitForTimeout(2500)

    // Switch to Docs tab again
    await switchToDocsTab(page)
    await page.waitForTimeout(1500)

    // Verify content survived the reload.
    // Monaco may render spaces as non-breaking spaces, so we normalise.
    await expect(async () => {
      const text = await page.evaluate(() => {
        const lines = document.querySelectorAll('.monaco-editor .view-lines .view-line')
        return Array.from(lines).map((l) => l.textContent ?? '').join('\n')
      })
      const normalised = text.replace(/\u00a0/g, ' ')
      // Check for key words that should be present regardless of space handling
      expect(normalised).toContain('Reload')
      expect(normalised).toContain('Doc')
    }).toPass({ timeout: 10000, intervals: [500] })
  })

  test('Switching between Code/Docs tabs preserves both', async ({ page, request }) => {
    // Create a diagram with code via API
    const mermaidCode = 'flowchart TD\n  A[Start] --> B[Process] --> C[End]'
    const id = await createDiagramViaApi(request, {
      title: 'Tab Switch Test',
      type: 'flowchart',
      code: mermaidCode,
    })

    // Also set markdown
    const mdContent = '# Architecture Notes\n\nImportant details here.'
    await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${id}`, {
      data: { markdown: mdContent },
    })

    // Navigate to the diagram
    await page.goto(`/diagram/${id}`)
    await page.waitForTimeout(2500)

    // Verify code is visible (Code tab is default)
    // Wait for the editor to have flowchart content
    await waitForCodeContaining(page, /flowchart/)
    const codeText1 = await getEditorCode(page)
    expect(codeText1).toContain('flowchart')

    // Switch to Docs tab — verify markdown visible
    await switchToDocsTab(page)
    await page.waitForTimeout(1500)
    await expect(async () => {
      const text = await page.evaluate(() => {
        const lines = document.querySelectorAll('.monaco-editor .view-lines .view-line')
        return Array.from(lines).map((l) => l.textContent ?? '').join('\n')
      })
      expect(text.replace(/\u00a0/g, ' ')).toContain('Architecture Notes')
    }).toPass({ timeout: 8000, intervals: [500] })

    // Switch back to Code tab — verify code STILL there
    await switchToCodeTab(page)
    await page.waitForTimeout(1000)
    // After switching back to Code tab, the Monaco editor reloads with Mermaid code.
    // Wait for it to appear.
    await expect(async () => {
      const code = await getEditorCode(page)
      expect(code).toContain('flowchart')
    }).toPass({ timeout: 10000, intervals: [500] })

    // Switch to Docs again — verify markdown STILL there
    await switchToDocsTab(page)
    await page.waitForTimeout(1500)
    await expect(async () => {
      const text = await page.evaluate(() => {
        const lines = document.querySelectorAll('.monaco-editor .view-lines .view-line')
        return Array.from(lines).map((l) => l.textContent ?? '').join('\n')
      })
      expect(text.replace(/\u00a0/g, ' ')).toContain('Architecture Notes')
    }).toPass({ timeout: 8000, intervals: [500] })
  })

  test('Export Markdown Doc triggers download', async ({ page, request }) => {
    // Create a diagram with code and markdown
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

    // Click the Export button to open the menu (use exact to avoid matching the title)
    const exportBtn = page.getByRole('button', { name: 'Export', exact: true })
    await exportBtn.click()
    await page.waitForTimeout(300)

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })

    // Click "Markdown Doc (.md)"
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

    // Switch to Code mode (full-width code panel with preview on right)
    await switchMode(page, 'Code')
    await page.waitForTimeout(500)

    // Switch to Docs tab
    await switchToDocsTab(page)
    await page.waitForTimeout(500)

    // The Mermaid preview pane (rendered SVG from mermaid) should still be visible.
    // In Code mode, the right side shows a Mermaid preview (rendered in an SVG element
    // or within a container with a mermaid-rendered diagram).
    // Look for the mermaid SVG or the preview container.
    const mermaidPreview = page.locator('[id^="mermaid-"], .mermaid-preview svg, [data-mermaid] svg')
    const hasMermaidSvg = await mermaidPreview.count()

    // Alternative: check that the preview panel container is visible
    // The preview panel typically renders the diagram as SVG
    if (hasMermaidSvg === 0) {
      // Check for any SVG in the preview section (right side of Code mode)
      const svgInPreview = page.locator('.overflow-auto svg, .mermaid svg')
      await expect(svgInPreview.first()).toBeVisible({ timeout: 5000 })
    } else {
      await expect(mermaidPreview.first()).toBeVisible({ timeout: 5000 })
    }
  })
})
