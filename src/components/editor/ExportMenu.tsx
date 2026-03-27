'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useDiagramStore } from '@/lib/store/diagram-store'
import { exportMermaidFile } from '@/lib/export/mermaid'
import { exportSvgFile } from '@/lib/export/svg'
import { exportPngFile } from '@/lib/export/png'
import { syncToCode } from '@/lib/sync/sync-engine'

interface ExportOption {
  label: string
  description: string
  action: (code: string, filename: string) => void | Promise<void>
}

export function ExportMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const code = useDiagramStore((s) => s.code)
  const title = useDiagramStore((s) => s.meta?.title ?? 'diagram')

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleExport = useCallback(
    async (action: ExportOption['action']) => {
      setIsExporting(true)
      setExportError(null)
      try {
        // Re-generate Mermaid code from the current canvas state so the
        // exported output matches what the user sees on screen.
        const { nodes, edges, meta } = useDiagramStore.getState()
        const diagramType = meta?.type ?? 'class'
        const freshCode =
          nodes.length > 0 ? syncToCode(nodes, edges, diagramType) : code

        await action(freshCode, title)
      } catch (err) {
        console.error('Export failed:', err)
        setExportError('Export failed — check that the diagram syntax is valid')
        setTimeout(() => setExportError(null), 4000)
      } finally {
        setIsExporting(false)
        setIsOpen(false)
      }
    },
    [code, title],
  )

  const options: ExportOption[] = [
    {
      label: 'Mermaid (.mmd)',
      description: 'Raw Mermaid source code',
      action: exportMermaidFile,
    },
    {
      label: 'SVG (.svg)',
      description: 'Scalable vector graphic',
      action: exportSvgFile,
    },
    {
      label: 'PNG (.png)',
      description: 'Raster image at 2x resolution',
      action: exportPngFile,
    },
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!code.trim() || isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/50 bg-surface text-foreground hover:bg-surface-hover hover:border-border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v7M4 6.5L7 9.5 10 6.5M3 11.5h8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Export
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path d="M2.5 4L5 6.5 7.5 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {exportError && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-red-500/50 bg-red-950/80 px-3 py-2 text-xs text-red-300 shadow-xl z-50">
          {exportError}
        </div>
      )}

      {isOpen && !exportError && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-border bg-surface shadow-xl shadow-black/30 overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Export as</p>
          </div>
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleExport(opt.action)}
              disabled={isExporting}
              className="w-full text-left px-3 py-2.5 hover:bg-surface-hover transition-colors flex flex-col gap-0.5 disabled:opacity-50"
            >
              <span className="text-sm text-foreground">{opt.label}</span>
              <span className="text-xs text-muted">{opt.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
