import mermaid from 'mermaid'

export async function exportSvgFile(code: string, filename: string) {
  const sanitized = filename.replace(/[^a-zA-Z0-9_-]/g, '_') || 'diagram'
  const id = `export-svg-${Date.now()}`
  const { svg } = await mermaid.render(id, code)

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitized}.svg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
