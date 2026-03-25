'use client'

import { useCallback, useRef, useEffect } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { useDiagramStore } from '@/lib/store/diagram-store'
import type { WebsocketProvider } from 'y-websocket'
import type * as Y from 'yjs'

// Derive the editor instance type from the OnMount callback signature
type MonacoEditorInstance = Parameters<OnMount>[0]

const MERMAID_KEYWORDS = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
  'erDiagram', 'gantt', 'pie', 'gitGraph', 'journey', 'mindmap', 'timeline',
  'TD', 'TB', 'BT', 'RL', 'LR',
  'participant', 'actor', 'as', 'note', 'over', 'left', 'right', 'of',
  'loop', 'alt', 'else', 'opt', 'par', 'and', 'critical', 'break', 'end',
  'class', 'direction', 'style', 'subgraph',
  'activate', 'deactivate', 'rect', 'rgb', 'rgba',
]

const THEME = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
    { token: 'type', foreground: '67e8f9' },
    { token: 'string', foreground: 'a5f3fc' },
    { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
    { token: 'delimiter', foreground: '6366f1' },
    { token: 'operator', foreground: 'c084fc' },
    { token: 'identifier', foreground: 'e4e4e7' },
    { token: 'number', foreground: 'f9a8d4' },
  ],
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

interface Props {
  /** When provided, the editor is bound to the shared Y.Text via y-monaco */
  yText?: Y.Text | null
  provider?: WebsocketProvider | null
}

export function CodeEditor({ yText, provider }: Props = {}) {
  const code = useDiagramStore((s) => s.code)
  const setCode = useDiagramStore((s) => s.setCode)

  // Hold a ref to the Monaco editor instance for the Yjs binding
  const editorRef = useRef<MonacoEditorInstance | null>(null)
  // Hold ref to MonacoBinding so we can destroy it on cleanup
  const bindingRef = useRef<{ destroy: () => void } | null>(null)

  // When the store code changes externally (e.g., canvas sync), update Monaco.
  // Skip only when MonacoBinding is actually active (bindingRef.current set) —
  // NOT just when yText is non-null, because there is an async window between
  // yText being set and MonacoBinding loading (dynamic import of y-monaco).
  const prevCodeRef = useRef(code)
  useEffect(() => {
    if (code === prevCodeRef.current) return
    prevCodeRef.current = code
    if (bindingRef.current) return
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    const currentValue = model.getValue()
    if (currentValue !== code) {
      model.setValue(code)
    }
  }, [code])

  // When yText changes (i.e. Yjs becomes available), create / recreate the binding
  useEffect(() => {
    if (!yText || !editorRef.current) return

    // Lazily import MonacoBinding to avoid SSR issues
    let cancelled = false
    import('y-monaco').then(({ MonacoBinding }) => {
      if (cancelled || !editorRef.current) return

      const model = editorRef.current.getModel()
      if (!model) return

      // Destroy any previous binding
      bindingRef.current?.destroy()

      const binding = new MonacoBinding(
        yText,
        model,
        new Set([editorRef.current]),
        provider?.awareness ?? undefined,
      )
      bindingRef.current = binding

      // Keep Zustand store in sync with Yjs text changes so the rest of the
      // app (preview, canvas sync) continues to work
      const observer = () => {
        setCode(yText.toString())
      }
      yText.observe(observer)
      // Return cleanup via the cancelled flag pattern
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
  }, [yText, provider, setCode])

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor

      monaco.languages.register({ id: 'mermaid' })

      monaco.languages.setMonarchTokensProvider('mermaid', {
        keywords: MERMAID_KEYWORDS,
        tokenizer: {
          root: [
            [/%%.*$/, 'comment'],
            [/"[^"]*"/, 'string'],
            [/'[^']*'/, 'string'],
            [/-->|--o|--x|<-->|-.->|==>|-----|---/, 'operator'],
            [/->>|-->>|-\)/, 'operator'],
            [/<<|>>/, 'delimiter'],
            [/[{}[\]()]/, 'delimiter'],
            [/:::/, 'delimiter'],
            [/\|/, 'delimiter'],
            [/\b\d+\b/, 'number'],
            [
              /[a-zA-Z_]\w*/,
              {
                cases: {
                  '@keywords': 'keyword',
                  '@default': 'identifier',
                },
              },
            ],
          ],
        },
      })

      monaco.languages.setLanguageConfiguration('mermaid', {
        comments: { lineComment: '%%' },
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')'],
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
      })

      monaco.editor.defineTheme('uml-dark', THEME)
      monaco.editor.setTheme('uml-dark')

      editor.updateOptions({
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
        tabSize: 4,
        insertSpaces: true,
        folding: true,
        glyphMargin: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3,
        overviewRulerBorder: false,
      })

      editor.focus()

      // If yText is already available when the editor mounts, trigger binding
      // by re-running the effect. We achieve this by calling the import directly.
      if (yText) {
        import('y-monaco').then(({ MonacoBinding }) => {
          if (!editorRef.current) return
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

          const observer = () => setCode(yText.toString())
          yText.observe(observer)
          ;(binding as unknown as { _yjsCleanup?: () => void })._yjsCleanup = () => {
            yText.unobserve(observer)
          }
        })
      }
    },
    [yText, provider, setCode],
  )

  const handleChange = useCallback(
    (value: string | undefined) => {
      // In Yjs mode, changes are handled by MonacoBinding; the observer above
      // propagates them to the store. In local-only mode, update store directly.
      if (!yText && value !== undefined) {
        setCode(value)
      }
    },
    [yText, setCode],
  )

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        defaultLanguage="mermaid"
        // Always controlled: @monaco-editor/react compares model.getValue()
        // against value and only calls executeEdits when they differ, so this
        // coexists safely with MonacoBinding (which keeps yText and model in
        // sync — the values match, so the controlled prop is a no-op).
        value={code}
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
    </div>
  )
}
