export function exportMarkdownDoc(title: string, markdown: string, code: string, filename: string) {
  const sanitized = filename.replace(/[^a-zA-Z0-9_-]/g, '_') || 'diagram'
  const content = `# ${title}\n\n${markdown}\n\n## Diagram\n\n\`\`\`mermaid\n${code}\n\`\`\`\n`
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitized}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
