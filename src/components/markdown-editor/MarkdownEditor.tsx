'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { useDiagramStore } from '@/lib/store/diagram-store'
import type { WebsocketProvider } from 'y-websocket'
import type * as Y from 'yjs'
import { MarkdownPreview } from './MarkdownPreview'

type MonacoEditorInstance = Parameters<OnMount>[0]

const THEME = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#0f0f13',
    'editor.foreground': '#e4e4e7',
    'editor.lineHighlightBackground': '#1a1a2240',
    'editor.selectionBackground': '#6366f140',
    'editor.inactiveSelectionBackground': '#6366f120',
    'editorCursor.foreground': '#6366f1',
    'editorLineNumber.foreground': '#71717a',
    'editorLineNumber.activeForeground': '#a1a1aa',
    'editorIndentGuide.background': '#2e2e3a',
    'editorIndentGuide.activeBackground': '#6366f180',
    'editor.selectionHighlightBackground': '#6366f120',
    'editorWidget.background': '#1a1a22',
    'editorWidget.border': '#2e2e3a',
    'input.background': '#1a1a22',
    'input.border': '#2e2e3a',
    'scrollbarSlider.background': '#2e2e3a80',
    'scrollbarSlider.hoverBackground': '#2e2e3aCC',
    'scrollbarSlider.activeBackground': '#6366f180',
    'editorOverviewRuler.border': '#0f0f13',
    'minimap.background': '#0f0f13',
  },
}

type ViewMode = 'edit' | 'preview'

interface Props {
  yText: Y.Text | null
  provider: WebsocketProvider | null
}

export function MarkdownEditor({ yText, provider }: Props) {
  const markdown = useDiagramStore((s) => s.markdown)
  const setMarkdown = useDiagramStore((s) => s.setMarkdown)

  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const editorRef = useRef<MonacoEditorInstance | null>(null)
  const [editorReady, setEditorReady] = useState(false)
  const bindingRef = useRef<{ destroy: () => void } | null>(null)

  // Sync store changes to Monaco when no Yjs binding is active
  const prevMarkdownRef = useRef(markdown)
  useEffect(() => {
    if (markdown === prevMarkdownRef.current) return
    prevMarkdownRef.current = markdown
    if (bindingRef.current) return
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    const currentValue = model.getValue()
    if (currentValue !== markdown) {
      model.setValue(markdown)
    }
  }, [markdown])

  // Yjs MonacoBinding
  useEffect(() => {
    if (!yText || !editorReady || !editorRef.current) return

    let cancelled = false
    import('y-monaco').then(({ MonacoBinding }) => {
      if (cancelled || !editorRef.current) return

      const model = editorRef.current.getModel()
      if (!model) return

      bindingRef.current?.destroy()

      const binding = new MonacoBinding(
        yText,
        model,
        new Set([editorRef.current]),
        provider?.awareness ?? undefined,
      )
      bindingRef.current = binding

      const observer = () => {
        setMarkdown(yText.toString())
      }
      yText.observe(observer)
      ;(binding as unknown as { _yjsCleanup?: () => void })._yjsCleanup = () => {
        yText.unobserve(observer)
      }
    })

    return () => {
      cancelled = true
      const b = bindingRef.current as unknown as { _yjsCleanup?: () => void } | null
      b?._yjsCleanup?.()
      bindingRef.current?.destroy()
      bindingRef.current = null
    }
  }, [yText, editorReady, provider, setMarkdown])

  const handleMount: OnMount = useCallback((_editor, monaco) => {
    editorRef.current = _editor
    setEditorReady(true)

    monaco.editor.defineTheme('uml-dark-md', THEME)
    monaco.editor.setTheme('uml-dark-md')

    _editor.updateOptions({
      fontFamily: 'var(--font-geist-mono), "Cascadia Code", "Fira Code", monospace',
      fontSize: 14,
      lineHeight: 22,
      padding: { top: 16, bottom: 16 },
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true,
      folding: true,
      glyphMargin: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 3,
      overviewRulerBorder: false,
    })

    _editor.focus()
  }, [])

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!yText && value !== undefined) {
        setMarkdown(value)
      }
    },
    [yText, setMarkdown],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-3 py-1 border-b border-border bg-background/50 shrink-0">
        <div className="flex gap-0.5 bg-surface rounded-md p-0.5 border border-border/50">
          {(['edit', 'preview'] as ViewMode[]).map((vm) => (
            <button
              key={vm}
              onClick={() => setViewMode(vm)}
              className={`px-2.5 py-0.5 text-xs font-medium rounded transition-all capitalize ${
                viewMode === vm
                  ? 'bg-accent text-white shadow-sm shadow-accent/25'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {vm === 'edit' ? 'Edit' : 'Preview'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'edit' ? (
          <Editor
            defaultLanguage="markdown"
            value={yText ? undefined : markdown}
            onChange={handleChange}
            onMount={handleMount}
            theme="vs-dark"
            loading={
              <div className="flex h-full items-center justify-center text-muted text-sm">
                Loading editor...
              </div>
            }
            options={{
              fontFamily: 'monospace',
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
          />
        ) : (
          <MarkdownPreview />
        )}
      </div>
    </div>
  )
}
