'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectMeta } from '@/lib/types/project'

interface Props {
  project: ProjectMeta
  itemCount: number
}

export function ProjectCard({ project, itemCount }: Props) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const relativeTime = getRelativeTime(project.updatedAt)

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return

      setIsDeleting(true)
      try {
        const res = await fetch(`/api/mcp/projects/${project.id}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          router.refresh()
        }
      } catch {
        setIsDeleting(false)
      }
    },
    [project.id, project.title, router],
  )

  const handleNavigate = useCallback(() => {
    router.push(`/project/${project.id}`)
  }, [router, project.id])

  return (
    <div
      className="relative p-4 bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors cursor-pointer group"
      onClick={handleNavigate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl opacity-40 group-hover:opacity-60 transition-opacity">
          &#x1F4C1;
        </span>
        <span className="text-xs text-muted px-2 py-0.5 bg-background rounded">
          {itemCount} {itemCount === 1 ? 'diagram' : 'diagrams'}
        </span>
      </div>
      <h3 className="font-medium truncate">{project.title}</h3>
      <p className="text-xs text-muted mt-1">{relativeTime}</p>

      {isHovered && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-2 right-2 p-1 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
          title="Delete project"
          aria-label="Delete project"
        >
          {isDeleting ? (
            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 3.5h10M5.5 3.5V2.5h3v1M5 3.5l.5 7.5h3L9 3.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
