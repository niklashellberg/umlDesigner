export function exportMermaidFile(code: string, filename: string) {
  const sanitized = filename.replace(/[^a-zA-Z0-9_-]/g, '_') || 'diagram'
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitized}.mmd`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
