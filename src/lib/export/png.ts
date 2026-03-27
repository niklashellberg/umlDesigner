import mermaid from 'mermaid'
import DOMPurify from 'dompurify'

export async function exportPngFile(code: string, filename: string) {
  const sanitized = filename.replace(/[^a-zA-Z0-9_-]/g, '_') || 'diagram'
  const id = `export-png-${Date.now()}`
  const { svg } = await mermaid.render(id, code)

  const cleanSvg = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['foreignObject'],
  })

  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  document.body.appendChild(container)

  const parser = new DOMParser()
  const doc = parser.parseFromString(cleanSvg, 'image/svg+xml')
  const svgElement = doc.documentElement
  container.appendChild(document.importNode(svgElement, true))

  const renderedSvg = container.querySelector('svg')
  if (!renderedSvg) {
    document.body.removeChild(container)
    throw new Error('Failed to render SVG')
  }

  const bbox = renderedSvg.getBoundingClientRect()
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = bbox.width * scale
  canvas.height = bbox.height * scale

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    document.body.removeChild(container)
    throw new Error('Failed to create canvas context')
  }

  ctx.scale(scale, scale)

  const svgData = new XMLSerializer().serializeToString(renderedSvg)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, bbox.width, bbox.height)
      URL.revokeObjectURL(svgUrl)
      document.body.removeChild(container)

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create PNG blob'))
          return
        }

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${sanitized}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        resolve()
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      document.body.removeChild(container)
      reject(new Error('Failed to load SVG as image'))
    }
    img.src = svgUrl
  })
}
