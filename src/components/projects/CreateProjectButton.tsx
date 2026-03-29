'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

export function CreateProjectButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleCreate() {
    const projectTitle = title.trim() || 'Untitled Project'
    const res = await fetch('/api/mcp/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: projectTitle }),
    })
    const { id } = await res.json()
    router.push(`/project/${id}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') {
      setIsOpen(false)
      setTitle('')
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="px-4 py-2 text-sm font-medium bg-surface hover:bg-surface-hover border border-border text-foreground rounded-lg transition-colors"
      >
        New Project
      </button>
    )
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Project title..."
        className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground placeholder:text-muted outline-none focus:border-accent transition-colors"
        autoFocus
      />
      <button
        onClick={handleCreate}
        className="px-3 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
      >
        Create
      </button>
      <button
        onClick={() => {
          setIsOpen(false)
          setTitle('')
        }}
        className="px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
