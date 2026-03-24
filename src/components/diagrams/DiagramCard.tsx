import type { DiagramMeta } from '@/lib/types/diagram'

const typeIcons: Record<string, string> = {
  class: '\u25A1',
  sequence: '\u2192',
  flowchart: '\u25C7',
}

interface Props {
  diagram: DiagramMeta
}

export function DiagramCard({ diagram }: Props) {
  const relativeTime = getRelativeTime(diagram.updatedAt)

  return (
    <div className="p-4 bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors cursor-pointer group">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl opacity-40 group-hover:opacity-60 transition-opacity">
          {typeIcons[diagram.type] || '\u25A1'}
        </span>
        <span className="text-xs text-muted capitalize px-2 py-0.5 bg-background rounded">
          {diagram.type}
        </span>
      </div>
      <h3 className="font-medium truncate">{diagram.title}</h3>
      <p className="text-xs text-muted mt-1">{relativeTime}</p>
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
