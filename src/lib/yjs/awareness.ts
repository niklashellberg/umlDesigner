'use client'

/**
 * Awareness utilities for user presence and cursor tracking.
 *
 * Each connected user broadcasts a small state object:
 *   { name, color, cursor: { x, y } | null }
 *
 * Colors are picked from a fixed palette using the client ID as a stable
 * seed so the same user always gets the same color within a session.
 */

import { useState, useEffect } from 'react'
import type { WebsocketProvider } from 'y-websocket'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface UserPresence {
  clientId: number
  name: string
  color: string
  cursor: { x: number; y: number } | null
}

export interface LocalAwarenessState {
  name: string
  color: string
  cursor: { x: number; y: number } | null
}

// ----------------------------------------------------------------------------
// Name and color generation
// ----------------------------------------------------------------------------

const COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
]

const ADJECTIVES = ['Quick', 'Bright', 'Calm', 'Bold', 'Swift', 'Sharp', 'Cool', 'Wise']
const NOUNS = ['Fox', 'Owl', 'Hawk', 'Bear', 'Wolf', 'Lynx', 'Deer', 'Crow']

function randomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj} ${noun}`
}

function colorFromClientId(clientId: number): string {
  return COLORS[clientId % COLORS.length]
}

// Generate a stable local identity for this session
let _localName: string | null = null
function getLocalName(): string {
  if (!_localName) {
    _localName = randomName()
  }
  return _localName
}

// ----------------------------------------------------------------------------
// Initialise local awareness state for a provider
// ----------------------------------------------------------------------------

export function initLocalAwareness(provider: WebsocketProvider): void {
  const clientId = provider.doc.clientID
  const state: LocalAwarenessState = {
    name: getLocalName(),
    color: colorFromClientId(clientId),
    cursor: null,
  }
  provider.awareness.setLocalState(state)
}

// ----------------------------------------------------------------------------
// Build snapshot of remote users from current awareness states
// ----------------------------------------------------------------------------

function buildRemoteUsers(
  provider: WebsocketProvider,
): UserPresence[] {
  const localClientId = provider.doc.clientID
  const result: UserPresence[] = []
  provider.awareness.getStates().forEach((state, clientId) => {
    if (clientId === localClientId || !state) return
    result.push({
      clientId,
      name: (state.name as string) || 'Unknown',
      color: (state.color as string) || colorFromClientId(clientId),
      cursor: (state.cursor as { x: number; y: number } | null) ?? null,
    })
  })
  return result
}

// ----------------------------------------------------------------------------
// React hook: list of connected users (excluding self)
// ----------------------------------------------------------------------------

export function useAwareness(provider: WebsocketProvider | null): UserPresence[] {
  const [users, setUsers] = useState<UserPresence[]>(() =>
    provider ? buildRemoteUsers(provider) : [],
  )

  useEffect(() => {
    if (!provider) return

    const awareness = provider.awareness

    function updateUsers() {
      setUsers(buildRemoteUsers(provider!))
    }

    awareness.on('change', updateUsers)

    return () => {
      awareness.off('change', updateUsers)
    }
  }, [provider])

  return users
}

// ----------------------------------------------------------------------------
// React hook: connection status
// ----------------------------------------------------------------------------

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

function deriveStatus(provider: WebsocketProvider | null): ConnectionStatus {
  if (!provider) return 'disconnected'
  if (provider.wsconnected) return 'connected'
  if (provider.wsconnecting) return 'connecting'
  return 'disconnected'
}

export function useConnectionStatus(provider: WebsocketProvider | null): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(() => deriveStatus(provider))

  useEffect(() => {
    if (!provider) return

    function handleStatus({ status: s }: { status: string }) {
      if (s === 'connected') setStatus('connected')
      else if (s === 'disconnected') setStatus('disconnected')
      else setStatus('connecting')
    }

    provider.on('status', handleStatus)

    return () => {
      provider.off('status', handleStatus)
    }
  }, [provider])

  return status
}
