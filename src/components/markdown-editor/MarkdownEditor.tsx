'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { useDiagramStore } from '@/lib/store/diagram-store'
import { copyAsHtml, copyAsMarkdown } from '@/lib/export/clipboard'
import type { WebsocketProvider } from 'y-websocket'
import type * as Y from 'yjs'
import { MarkdownPreview } from './MarkdownPreview'

type ViewMode = 'edit' | 'preview'

interface Props {
  yText: Y.Text | null
  provider: WebsocketProvider | null
}

export function MarkdownEditor({ yText, provider }: Props) {
  const markdown = useDiagramStore((s) => s.markdown)
  const setMarkdown = useDiagramStore((s) => s.setMarkdown)

  const code = useDiagramStore((s) => s.code)
  const title = useDiagramStore((s) => s.meta?.title ?? 'Untitled')

  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep textarea in sync with store (for external updates / Yjs)
  const isLocalChange = useRef(false)
  useEffect(() => {
    if (isLocalChange.current) {
      isLocalChange.current = false
      return
    }
    if (textareaRef.current && textareaRef.current.value !== markdown) {
      textareaRef.current.value = markdown
    }
  }, [markdown])

  // Yjs binding: observe Y.Text and push changes to store + textarea
  useEffect(() => {
    if (!yText) return

    const observer = () => {
      const text = yText.toString()
      setMarkdown(text)
      if (textareaRef.current && textareaRef.current.value !== text) {
        // Preserve cursor position
        const start = textareaRef.current.selectionStart
        const end = textareaRef.current.selectionEnd
        textareaRef.current.value = text
        textareaRef.current.setSelectionRange(start, end)
      }
    }
    yText.observe(observer)
    return () => yText.unobserve(observer)
  }, [yText, setMarkdown])

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      isLocalChange.current = true
      setMarkdown(value)

      // Push to Yjs if available
      if (yText) {
        const currentText = yText.toString()
        if (currentText !== value) {
          yText.doc?.transact(() => {
            yText.delete(0, yText.length)
            yText.insert(0, value)
          })
        }
      }
    },
    [yText, setMarkdown],
  )

  const insertDiagram = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const before = ta.value.slice(0, start)
    const after = ta.value.slice(ta.selectionEnd)
    const insert = '\n\n{{diagram}}\n\n'
    const newValue = before + insert + after
    ta.value = newValue
    ta.selectionStart = ta.selectionEnd = start + insert.length
    // Trigger change
    isLocalChange.current = true
    setMarkdown(newValue)
    if (yText) {
      yText.doc?.transact(() => {
        yText.delete(0, yText.length)
        yText.insert(0, newValue)
      })
    }
    ta.focus()
  }, [yText, setMarkdown])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts 2 spaces instead of moving focus
      if (e.key === 'Tab') {
        e.preventDefault()
        const ta = e.currentTarget
        const start = ta.selectionStart
        const before = ta.value.slice(0, start)
        const after = ta.value.slice(ta.selectionEnd)
        const newValue = before + '  ' + after
        ta.value = newValue
        ta.selectionStart = ta.selectionEnd = start + 2
        isLocalChange.current = true
        setMarkdown(newValue)
        if (yText) {
          yText.doc?.transact(() => {
            yText.delete(0, yText.length)
            yText.insert(0, newValue)
          })
        }
      }
    },
    [yText, setMarkdown],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border bg-background/50 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={insertDiagram}
            disabled={viewMode !== 'edit'}
            className="px-2.5 py-0.5 text-xs font-medium text-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Insert current diagram reference"
          >
            + Diagram
          </button>
          <button
            onClick={async () => {
              try {
                await copyAsHtml(title, markdown, code)
                setCopyFeedback('HTML')
                setTimeout(() => setCopyFeedback(null), 1500)
              } catch { /* clipboard not available */ }
            }}
            className="px-2.5 py-0.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
            title="Copy as rich HTML for Confluence/Notion"
          >
            {copyFeedback === 'HTML' ? 'Copied!' : 'Copy HTML'}
          </button>
          <button
            onClick={async () => {
              try {
                await copyAsMarkdown(markdown, code)
                setCopyFeedback('MD')
                setTimeout(() => setCopyFeedback(null), 1500)
              } catch { /* clipboard not available */ }
            }}
            className="px-2.5 py-0.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
            title="Copy as Markdown for GitHub wiki"
          >
            {copyFeedback === 'MD' ? 'Copied!' : 'Copy MD'}
          </button>
        </div>
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
          <textarea
            ref={textareaRef}
            defaultValue={markdown}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Write documentation in Markdown..."
            spellCheck={false}
            className="w-full h-full resize-none bg-[#0f0f13] text-[#e4e4e7] font-mono text-sm leading-relaxed p-4 outline-none placeholder:text-[#71717a]/50 selection:bg-[#6366f1]/25"
          />
        ) : (
          <MarkdownPreview />
        )}
      </div>
    </div>
  )
}
