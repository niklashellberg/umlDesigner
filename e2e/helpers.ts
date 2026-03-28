import { type Page, type APIRequestContext, expect } from '@playwright/test'

/** Generate a timestamp string for naming: YYYY-MM-DD_HHmm */
export function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

/** Create a new diagram of the given type and navigate to its editor. */
export async function createDiagram(
  page: Page,
  type: 'class' | 'flowchart' | 'activity',
): Promise<string> {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Diagram' }).click()
  await page.getByRole('button', { name: type }).click()
  await page.waitForURL(/\/diagram\//)
  // Wait for the editor to initialise and Yjs to sync (includes WS handshake)
  await page.waitForTimeout(2500)
  return page.url()
}

/** Rename the diagram by clicking the title, typing a new name, and pressing Enter. */
export async function renameDiagram(page: Page, name: string): Promise<void> {
  // Click the title button (shows current title text)
  const titleBtn = page.locator('button[title="Click to edit title"]')
  await titleBtn.click()
  const input = page.locator('header input')
  await input.fill(name)
  await input.press('Enter')
  // Wait for save
  await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 })
}

/** Switch editor mode. */
export async function switchMode(
  page: Page,
  mode: 'Code' | 'Split' | 'Visual',
): Promise<void> {
  const modeBtn = page
    .locator('header')
    .getByRole('button', { name: mode, exact: true })
  await modeBtn.click()
  await page.waitForTimeout(500)
}

/** Get the current Mermaid code from Monaco editor via the DOM. */
export async function getEditorCode(page: Page): Promise<string> {
  // Monaco renders content inside .view-lines; grab all visible line text.
  // Monaco uses \u00a0 (non-breaking space) instead of regular spaces in
  // its DOM, so we normalise them to regular spaces for assertion matching.
  const raw = await page.evaluate(() => {
    const lines = document.querySelectorAll('.monaco-editor .view-lines .view-line')
    return Array.from(lines).map((l) => l.textContent ?? '').join('\n')
  })
  return raw.replace(/\u00a0/g, ' ')
}

/**
 * Replace the Monaco editor content with the given code.
 * Uses the Monaco API directly (via window) to avoid Yjs race conditions.
 */
export async function typeInEditor(page: Page, code: string): Promise<void> {
  // Wait for Monaco to be available
  const editor = page.locator('.monaco-editor')
  await editor.waitFor({ state: 'visible' })

  // Click to focus the editor first
  const viewLines = page.locator('.monaco-editor .view-lines')
  await viewLines.click()
  await page.waitForTimeout(300)

  // Use keyboard to select all and replace — more reliable with Yjs binding
  const isMac = process.platform === 'darwin'
  const mod = isMac ? 'Meta' : 'Control'

  // Select all and delete existing content
  await page.keyboard.press(`${mod}+a`)
  await page.waitForTimeout(100)
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(300)

  // Verify editor is empty before typing
  await page.keyboard.press(`${mod}+a`)
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(200)

  // Type the new code line by line
  const lines = code.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) await page.keyboard.press('Enter')
    await page.keyboard.type(lines[i], { delay: 15 })
  }

  // Wait for the store to pick up the changes
  await page.waitForTimeout(500)
}

/**
 * Set diagram code via the API, bypassing Monaco/Yjs.
 * Extracts the diagram ID from the current page URL.
 */
export async function setDiagramCodeViaApi(
  request: APIRequestContext,
  page: Page,
  code: string,
): Promise<void> {
  const url = page.url()
  const match = url.match(/\/diagram\/([^/?#]+)/)
  if (!match) throw new Error(`Cannot extract diagram ID from URL: ${url}`)
  const id = match[1]

  const res = await request.put(`http://127.0.0.1:3000/api/mcp/diagrams/${id}`, {
    data: { code },
  })
  expect(res.status()).toBe(200)
}

/** Count the number of React Flow nodes currently visible on the canvas. */
export async function countCanvasNodes(page: Page): Promise<number> {
  return page.locator('.react-flow__node').count()
}

/** Count the number of React Flow edges currently visible on the canvas. */
export async function countCanvasEdges(page: Page): Promise<number> {
  return page.locator('.react-flow__edge').count()
}

/**
 * Drag a tool from the ToolPanel onto the canvas at a specific position.
 * `toolLabel` must match the visible text in the panel (e.g. "Class", "Process").
 */
export async function dragToolToCanvas(
  page: Page,
  toolLabel: string,
  targetX: number,
  targetY: number,
): Promise<void> {
  const tool = page.locator('[draggable="true"]').filter({ hasText: toolLabel }).first()
  const canvas = page.locator('.react-flow')

  // Get the bounding boxes
  const toolBox = await tool.boundingBox()
  const canvasBox = await canvas.boundingBox()
  if (!toolBox || !canvasBox) throw new Error(`Could not find tool "${toolLabel}" or canvas`)

  // Use manual mouse events for drag & drop (Playwright's dragTo doesn't always
  // work with custom dataTransfer MIME types).
  const startX = toolBox.x + toolBox.width / 2
  const startY = toolBox.y + toolBox.height / 2
  const dropX = canvasBox.x + targetX
  const dropY = canvasBox.y + targetY

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  // Move in steps so React Flow registers the drag
  await page.mouse.move(dropX, dropY, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)
}

/**
 * Connect two nodes by dragging from a source handle to a target handle.
 * Uses the bottom handle of source → top handle of target.
 */
export async function connectNodes(
  page: Page,
  sourceNodeIndex: number,
  targetNodeIndex: number,
): Promise<void> {
  const nodes = page.locator('.react-flow__node')
  const sourceNode = nodes.nth(sourceNodeIndex)
  const targetNode = nodes.nth(targetNodeIndex)

  // Find the source (bottom) handle and target (top) handle
  const sourceHandle = sourceNode.locator('.react-flow__handle-bottom').first()
  const targetHandle = targetNode.locator('.react-flow__handle-top').first()

  const sourceBB = await sourceHandle.boundingBox()
  const targetBB = await targetHandle.boundingBox()
  if (!sourceBB || !targetBB) throw new Error('Could not find node handles')

  await page.mouse.move(sourceBB.x + sourceBB.width / 2, sourceBB.y + sourceBB.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    targetBB.x + targetBB.width / 2,
    targetBB.y + targetBB.height / 2,
    { steps: 10 },
  )
  await page.mouse.up()
  await page.waitForTimeout(300)
}

/**
 * Wait until the code editor contains text matching the given pattern.
 * Polls every 500ms up to `timeoutMs`.
 */
export async function waitForCodeContaining(
  page: Page,
  pattern: RegExp | string,
  timeoutMs = 8000,
): Promise<void> {
  const re = typeof pattern === 'string' ? new RegExp(pattern) : pattern
  await expect(async () => {
    const code = await getEditorCode(page)
    expect(code).toMatch(re)
  }).toPass({ timeout: timeoutMs, intervals: [500] })
}

/**
 * Wait until the canvas has at least `n` nodes.
 */
export async function waitForCanvasNodes(
  page: Page,
  n: number,
  timeoutMs = 8000,
): Promise<void> {
  await expect(async () => {
    const count = await countCanvasNodes(page)
    expect(count).toBeGreaterThanOrEqual(n)
  }).toPass({ timeout: timeoutMs, intervals: [500] })
}
