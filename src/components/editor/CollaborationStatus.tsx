'use client'

/**
 * Compact collaboration status bar shown in the DiagramEditor header.
 *
 * Displays:
 *   • Connection status dot (connecting / connected / disconnected)
 *   • Coloured avatars for each remote collaborator
 *   • A tooltip-style label on hover
 */

import type { WebsocketProvider } from 'y-websocket'
import { useAwareness, useConnectionStatus } from '@/lib/yjs/awareness'

interface Props {
  provider: WebsocketProvider | null
}

export function CollaborationStatus({ provider }: Props) {
  const status = useConnectionStatus(provider)
  const remoteUsers = useAwareness(provider)

  if (!provider) return null

  const statusColor =
    status === 'connected'
      ? 'bg-emerald-400'
      : status === 'connecting'
        ? 'bg-amber-400 animate-pulse'
        : 'bg-zinc-500'

  const statusLabel =
    status === 'connected'
      ? 'Live'
      : status === 'connecting'
        ? 'Connecting…'
        : 'Offline'

  return (
    <div className="flex items-center gap-2">
      {/* Connection indicator */}
      <span
        className="flex items-center gap-1.5 text-xs text-muted"
        title={statusLabel}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor}`} />
        {statusLabel}
      </span>

      {/* Remote collaborator avatars */}
      {remoteUsers.length > 0 && (
        <div className="flex items-center gap-1">
          {remoteUsers.slice(0, 5).map((user) => (
            <span
              key={user.clientId}
              title={user.name}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background cursor-default select-none"
              style={{ backgroundColor: user.color }}
            >
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
          {remoteUsers.length > 5 && (
            <span className="text-xs text-muted">+{remoteUsers.length - 5}</span>
          )}
        </div>
      )}
    </div>
  )
}
