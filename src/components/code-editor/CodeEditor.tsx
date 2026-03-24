'use client'

import { useCallback } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { useDiagramStore } from '@/lib/store/diagram-store'

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

export function CodeEditor() {
  const code = useDiagramStore((s) => s.code)
  const setCode = useDiagramStore((s) => s.setCode)

  const handleMount: OnMount = useCallback((editor, monaco) => {
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
  }, [])

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setCode(value)
      }
    },
    [setCode],
  )

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        defaultLanguage="mermaid"
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
