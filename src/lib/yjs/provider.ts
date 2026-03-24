'use client'

/**
 * Creates and manages a y-websocket WebsocketProvider for a given diagram.
 *
 * The room name is the diagram ID so each diagram gets its own Yjs document
 * on the server. The WS URL is derived from window.location.hostname so the
 * app works for LAN collaborators without config changes.
 */

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface YjsProvider {
  doc: Y.Doc
  provider: WebsocketProvider
  destroy: () => void
}

function getServerUrl(): string {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  return `ws://${hostname}:4444`
}

/**
 * Creates a new Y.Doc and connects a WebsocketProvider for the given diagram.
 * Returns the doc, provider, and a cleanup function.
 *
 * @param diagramId – used as the Yjs room name
 */
export function createYjsProvider(diagramId: string): YjsProvider {
  const doc = new Y.Doc()
  const serverUrl = getServerUrl()

  const provider = new WebsocketProvider(serverUrl, diagramId, doc, {
    connect: true,
  })

  const destroy = () => {
    provider.destroy()
    doc.destroy()
  }

  return { doc, provider, destroy }
}
