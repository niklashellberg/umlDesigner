'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'
import { useDiagramStore } from '@/lib/store/diagram-store'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  darkMode: true,
  themeVariables: {
    darkMode: true,
    background: '#1a1a22',
    primaryColor: '#6366f1',
    primaryTextColor: '#e4e4e7',
    primaryBorderColor: '#2e2e3a',
    secondaryColor: '#24242e',
    secondaryTextColor: '#e4e4e7',
    secondaryBorderColor: '#2e2e3a',
    tertiaryColor: '#1a1a22',
    lineColor: '#71717a',
    textColor: '#e4e4e7',
    mainBkg: '#1a1a22',
    nodeBorder: '#6366f1',
    clusterBkg: '#24242e',
    clusterBorder: '#2e2e3a',
    titleColor: '#e4e4e7',
    edgeLabelBackground: '#1a1a22',
    nodeTextColor: '#e4e4e7',
  },
  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  fontSize: 14,
})

function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['foreignObject'],
  })
}

export function MermaidPreview() {
  const code = useDiagramStore((s) => s.code)
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const renderDiagram = useCallback(async (mermaidCode: string) => {
    if (!mermaidCode.trim()) {
      setSvgContent('')
      setError(null)
      return
    }

    try {
      const id = `mermaid-${Date.now()}`
      const { svg } = await mermaid.render(id, mermaidCode)
      setSvgContent(sanitizeSvg(svg))
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid Mermaid syntax'
      setError(message)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      renderDiagram(code)
    }, 400)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [code, renderDiagram])

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Preview</span>
        {error && (
          <span className="text-xs text-red-400 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
            Syntax error
          </span>
        )}
        {!error && svgContent && (
          <span className="text-xs text-emerald-400 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Valid
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="p-4">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm font-medium text-red-400 mb-2">Syntax Error</p>
              <pre className="text-xs text-red-300/80 font-mono whitespace-pre-wrap break-words leading-relaxed">
                {error.replace(/\n*Syntax error in.*$/, '').trim()}
              </pre>
            </div>
          </div>
        ) : svgContent ? (
          <div
            ref={containerRef}
            className="flex min-h-full items-center justify-center p-8 [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted">Write some Mermaid code to see a preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
