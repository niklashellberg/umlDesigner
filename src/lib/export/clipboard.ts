import mermaid from 'mermaid'

/**
 * Copy markdown with Mermaid fences rendered as SVG images to clipboard
 * as rich HTML (for pasting into Confluence, Notion, etc.)
 */
export async function copyAsHtml(
  title: string,
  markdown: string,
  code: string,
): Promise<void> {
  // Process {{diagram}} tokens
  const processed = markdown.replace(
    /\{\{diagram\}\}/g,
    `\`\`\`mermaid\n${code}\n\`\`\``,
  )

  // Render Mermaid blocks to SVG
  let html = `<h1>${escapeHtml(title)}</h1>\n`
  const parts = processed.split(/(```mermaid\n[\s\S]*?\n```)/g)

  for (const part of parts) {
    const mermaidMatch = part.match(/```mermaid\n([\s\S]*?)\n```/)
    if (mermaidMatch) {
      try {
        mermaid.initialize({ startOnLoad: false, theme: 'default' })
        const id = `clipboard-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const { svg } = await mermaid.render(id, mermaidMatch[1])
        html += `<div>${svg}</div>\n`
      } catch {
        html += `<pre><code>${escapeHtml(mermaidMatch[1])}</code></pre>\n`
      }
    } else {
      // Convert markdown to simple HTML (basic conversion)
      const converted = part
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^\s*$/, '')
      if (converted.trim()) {
        html += `<p>${converted}</p>\n`
      }
    }
  }

  // Copy as rich HTML to clipboard
  const blob = new Blob([html], { type: 'text/html' })
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': blob,
      'text/plain': new Blob([processed], { type: 'text/plain' }),
    }),
  ])
}

/**
 * Copy raw markdown with Mermaid code fences to clipboard.
 * {{diagram}} tokens are expanded to actual Mermaid code.
 */
export async function copyAsMarkdown(
  markdown: string,
  code: string,
): Promise<void> {
  const processed = markdown.replace(
    /\{\{diagram\}\}/g,
    `\`\`\`mermaid\n${code}\n\`\`\``,
  )
  await navigator.clipboard.writeText(processed)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
