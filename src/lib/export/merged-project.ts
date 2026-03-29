export async function exportMergedProject(
  projectTitle: string,
  items: Array<{ diagramId: string }>,
) {
  const sections: string[] = [`# ${projectTitle}\n`]

  for (const item of items) {
    const res = await fetch(`/api/mcp/diagrams/${item.diagramId}`)
    if (!res.ok) continue

    const diagram = await res.json()
    const title = diagram.meta?.title ?? 'Untitled'
    const markdown = diagram.markdown ?? ''
    const code = diagram.code ?? ''

    sections.push(`## ${title}\n`)
    if (markdown) {
      sections.push(`${markdown}\n`)
    }
    if (code) {
      sections.push(`\`\`\`mermaid\n${code}\n\`\`\`\n`)
    }
  }

  const content = sections.join('\n')
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectTitle.replace(/[^a-zA-Z0-9-_ ]/g, '')}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
