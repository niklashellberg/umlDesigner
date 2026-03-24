'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Diagram } from '@/lib/types/diagram'

type EditorMode = 'code' | 'visual' | 'split'

interface Props {
  diagram: Diagram
}

export function DiagramEditor({ diagram }: Props) {
  const [mode, setMode] = useState<EditorMode>('code')
  const [code, setCode] = useState(diagram.code)

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted hover:text-foreground transition-colors text-sm"
          >
            &larr; Back
          </Link>
          <h1 className="font-medium">{diagram.meta.title}</h1>
          <span className="text-xs text-muted capitalize px-2 py-0.5 bg-surface rounded">
            {diagram.meta.type}
          </span>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-surface rounded-lg p-0.5">
          {(['code', 'visual', 'split'] as EditorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
                mode === m
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        {(mode === 'code' || mode === 'split') && (
          <div className={`flex flex-col ${mode === 'split' ? 'w-1/2 border-r border-border' : 'w-full'}`}>
            <div className="flex-1 p-4 font-mono text-sm">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full bg-transparent resize-none outline-none"
                spellCheck={false}
                placeholder="Write Mermaid code here..."
              />
            </div>
          </div>
        )}

        {(mode === 'visual' || mode === 'split') && (
          <div className={`flex flex-col ${mode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="flex-1 flex items-center justify-center text-muted">
              <p className="text-sm">Visual canvas (Phase 3)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
