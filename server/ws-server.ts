/**
 * y-websocket compatible server for Yjs CRDT collaboration.
 *
 * Implements the Yjs sync protocol manually (y-websocket v3 is browser-only)
 * using ws + y-protocols + yjs. Each diagram room gets its own Y.Doc that
 * is persisted to disk under data/diagrams/<roomName>.bin so state survives
 * restarts.
 *
 * Message format (from y-websocket client source):
 *   0 = messageSync
 *   1 = messageAwareness
 *   2 = messageAuth
 *   3 = messageQueryAwareness
 */

import * as fs from 'fs'
import * as path from 'path'
import { WebSocketServer, WebSocket } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const PORT = Number(process.env.WS_PORT) || 4444
const DATA_DIR = path.resolve(process.cwd(), 'data/diagrams')

// Ensure persistence directory exists
fs.mkdirSync(DATA_DIR, { recursive: true })

const messageSync = 0
const messageAwareness = 1
const messageQueryAwareness = 3

// ----------------------------------------------------------------------------
// Room management
// ----------------------------------------------------------------------------

interface Room {
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  clients: Set<WebSocket>
}

const rooms = new Map<string, Room>()

function persistencePath(roomName: string): string {
  // Sanitise room name so it's safe to use as a filename
  const safe = roomName.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(DATA_DIR, `${safe}.bin`)
}

function loadDoc(roomName: string): Y.Doc {
  const doc = new Y.Doc()
  const filePath = persistencePath(roomName)
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath)
      Y.applyUpdate(doc, new Uint8Array(data))
      console.log(`[ws-server] Loaded persisted doc for room "${roomName}"`)
    } catch (err) {
      console.error(`[ws-server] Failed to load doc for room "${roomName}":`, err)
    }
  }
  return doc
}

function saveDoc(roomName: string, doc: Y.Doc): void {
  const filePath = persistencePath(roomName)
  try {
    const update = Y.encodeStateAsUpdate(doc)
    fs.writeFileSync(filePath, update)
  } catch (err) {
    console.error(`[ws-server] Failed to persist doc for room "${roomName}":`, err)
  }
}

function getOrCreateRoom(roomName: string): Room {
  let room = rooms.get(roomName)
  if (room) return room

  const doc = loadDoc(roomName)
  const awareness = new awarenessProtocol.Awareness(doc)

  // Persist on every document update (throttle to avoid hammering disk)
  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  doc.on('update', () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveDoc(roomName, doc), 500)
  })

  room = { doc, awareness, clients: new Set() }
  rooms.set(roomName, room)
  return room
}

// ----------------------------------------------------------------------------
// Message sending helpers
// ----------------------------------------------------------------------------

function send(ws: WebSocket, message: Uint8Array): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message, { binary: true })
  }
}

function broadcastToRoom(room: Room, message: Uint8Array, exclude?: WebSocket): void {
  for (const client of room.clients) {
    if (client !== exclude) {
      send(client, message)
    }
  }
}

// ----------------------------------------------------------------------------
// Message handling
// ----------------------------------------------------------------------------

function handleMessage(ws: WebSocket, room: Room, data: Uint8Array): void {
  const decoder = decoding.createDecoder(data)
  const msgType = decoding.readVarUint(decoder)

  switch (msgType) {
    case messageSync: {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      const syncMsgType = syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws)

      // If we produced a reply, send it back to the sender
      if (encoding.length(encoder) > 1) {
        send(ws, encoding.toUint8Array(encoder))
      }

      // After receiving SyncStep2, broadcast the update to all other peers
      // so they stay in sync when a second client joins
      if (syncMsgType === syncProtocol.messageYjsSyncStep2) {
        const updateEncoder = encoding.createEncoder()
        encoding.writeVarUint(updateEncoder, messageSync)
        syncProtocol.writeSyncStep2(updateEncoder, room.doc)
        broadcastToRoom(room, encoding.toUint8Array(updateEncoder), ws)
      }
      break
    }

    case messageAwareness: {
      const update = decoding.readVarUint8Array(decoder)
      awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws)

      // Relay awareness to everyone else in the room
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(encoder, update)
      broadcastToRoom(room, encoding.toUint8Array(encoder), ws)
      break
    }

    case messageQueryAwareness: {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(room.awareness.getStates().keys()),
        ),
      )
      send(ws, encoding.toUint8Array(encoder))
      break
    }

    default:
      console.warn(`[ws-server] Unknown message type: ${msgType}`)
  }
}

// ----------------------------------------------------------------------------
// WebSocket server
// ----------------------------------------------------------------------------

const wss = new WebSocketServer({ port: PORT })

wss.on('connection', (ws, req) => {
  // The client connects to ws://host:PORT/<roomName>
  const roomName = (req.url ?? '/').replace(/^\//, '') || 'default'
  const room = getOrCreateRoom(roomName)
  const clientAddr = req.socket.remoteAddress ?? 'unknown'

  room.clients.add(ws)
  console.log(
    `[ws-server] Client connected  room="${roomName}" addr=${clientAddr} ` +
    `peers=${room.clients.size}`,
  )

  // Send sync step 1 so the client can bootstrap
  const syncEncoder = encoding.createEncoder()
  encoding.writeVarUint(syncEncoder, messageSync)
  syncProtocol.writeSyncStep1(syncEncoder, room.doc)
  send(ws, encoding.toUint8Array(syncEncoder))

  // Immediately follow with sync step 2 (full state) so new clients catch up
  const stateEncoder = encoding.createEncoder()
  encoding.writeVarUint(stateEncoder, messageSync)
  syncProtocol.writeSyncStep2(stateEncoder, room.doc)
  send(ws, encoding.toUint8Array(stateEncoder))

  // Send current awareness states
  if (room.awareness.getStates().size > 0) {
    const awarenessEncoder = encoding.createEncoder()
    encoding.writeVarUint(awarenessEncoder, messageAwareness)
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        room.awareness,
        Array.from(room.awareness.getStates().keys()),
      ),
    )
    send(ws, encoding.toUint8Array(awarenessEncoder))
  }

  ws.on('message', (rawData) => {
    try {
      const data = rawData instanceof Buffer
        ? new Uint8Array(rawData)
        : new Uint8Array(rawData as ArrayBuffer)
      handleMessage(ws, room, data)
    } catch (err) {
      console.error('[ws-server] Error handling message:', err)
    }
  })

  ws.on('close', () => {
    room.clients.delete(ws)
    console.log(
      `[ws-server] Client disconnected room="${roomName}" addr=${clientAddr} ` +
      `peers=${room.clients.size}`,
    )

    // Clean up awareness for this client
    // We track clientID via a WeakMap set during awareness updates
    const clientIds = clientIdsBySocket.get(ws)
    if (clientIds && clientIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        Array.from(clientIds),
        'client disconnected',
      )
    }
    clientIdsBySocket.delete(ws)

    // If room is empty, clean it up from memory (doc stays persisted on disk)
    if (room.clients.size === 0) {
      // Give 60s grace period before removing from memory
      setTimeout(() => {
        if (room.clients.size === 0) {
          rooms.delete(roomName)
          console.log(`[ws-server] Room "${roomName}" evicted from memory`)
        }
      }, 60_000)
    }
  })

  ws.on('error', (err) => {
    console.error(`[ws-server] Socket error room="${roomName}":`, err.message)
  })
})

// Track which Yjs clientIDs belong to each WebSocket so we can clean up awareness on disconnect
const clientIdsBySocket = new WeakMap<WebSocket, Set<number>>()

// Hook into awareness updates to learn clientID -> socket mappings
rooms.forEach((room) => {
  room.awareness.on('update', ({ added, updated }: { added: number[], updated: number[], removed: number[] }, origin: unknown) => {
    if (origin instanceof WebSocket) {
      let ids = clientIdsBySocket.get(origin)
      if (!ids) {
        ids = new Set()
        clientIdsBySocket.set(origin, ids)
      }
      for (const id of [...added, ...updated]) ids.add(id)
    }
  })
})

wss.on('listening', () => {
  console.log(`[ws-server] Yjs WebSocket server listening on ws://0.0.0.0:${PORT}`)
  console.log(`[ws-server] Persisting docs to ${DATA_DIR}`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[ws-server] Shutting down...')
  wss.close(() => process.exit(0))
})
process.on('SIGTERM', () => {
  console.log('[ws-server] Shutting down...')
  wss.close(() => process.exit(0))
})
