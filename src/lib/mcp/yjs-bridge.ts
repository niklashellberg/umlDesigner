/**
 * MCP-to-Yjs bridge: server-side utility that connects to the y-websocket
 * server as a transient client, pushes a document update, then disconnects.
 *
 * IMPORTANT: The bridge must sync with the server FIRST (receive the server's
 * full state) before making changes. Without this, a fresh Y.Doc would insert
 * code alongside the existing server content (different clientId) and Yjs CRDT
 * would keep both, doubling the text on every call.
 *
 * Flow:
 *   1. Open a WebSocket to ws://localhost:4444/<roomName>
 *   2. Send SyncStep1 (empty state vector) to request the server's state
 *   3. Receive SyncStep2 (server's full state) – apply to local doc
 *   4. Now that localDoc has the server's items: delete all code + insert new
 *   5. Send the diff back to the server, then close
 */

import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { WebSocket } from 'ws'
import { getSharedCode } from '@/lib/yjs/document'

const WS_SERVER_URL = process.env.YJS_WS_URL || 'ws://localhost:4444'

const messageSync = 0

// How long (ms) to wait for the server sync before giving up
const SYNC_TIMEOUT_MS = 5_000

type BridgeResult = { ok: true } | { ok: false; error: string }

function parseRawData(raw: unknown): Uint8Array {
  if (raw instanceof Buffer) return new Uint8Array(raw)
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw)
  if (Array.isArray(raw)) return new Uint8Array(Buffer.concat(raw as Buffer[]))
  return new Uint8Array(Buffer.from(raw as ArrayBuffer))
}

/**
 * Push a mermaid code string into a live Yjs room.
 *
 * If the WS server is not reachable the function resolves with ok:false so
 * the caller can still return a successful HTTP response — the JSON file has
 * already been updated by the time this runs.
 */
export async function pushCodeToYjs(
  diagramId: string,
  newCode: string,
): Promise<BridgeResult> {
  return new Promise((resolve) => {
    // Start with an empty doc — we populate it AFTER syncing with the server
    // so that delete operations target the actual server-side Y.Text items.
    const localDoc = new Y.Doc()

    const url = `${WS_SERVER_URL}/${diagramId}`
    let ws: WebSocket

    try {
      ws = new WebSocket(url)
    } catch (err) {
      localDoc.destroy()
      resolve({ ok: false, error: `Failed to open WebSocket: ${String(err)}` })
      return
    }

    // Cleanup helper — resolve + close once, ignore subsequent calls
    let settled = false
    function finish(result: BridgeResult) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      localDoc.destroy()
      try {
        ws.close()
      } catch {
        // ignore close errors
      }
      resolve(result)
    }

    const timer = setTimeout(() => {
      finish({ ok: false, error: 'Timed out waiting for Yjs server sync' })
    }, SYNC_TIMEOUT_MS)

    ws.binaryType = 'arraybuffer'

    ws.on('error', (err) => {
      finish({ ok: false, error: `WebSocket error: ${err.message}` })
    })

    // Track whether we have applied our change
    let applied = false

    ws.on('message', (raw) => {
      try {
        const data = parseRawData(raw)
        const decoder = decoding.createDecoder(data)
        const msgType = decoding.readVarUint(decoder)

        if (msgType !== messageSync) return

        // Process the sync message — readSyncMessage applies updates to
        // localDoc and may write a reply into the encoder.
        const replyEncoder = encoding.createEncoder()
        encoding.writeVarUint(replyEncoder, messageSync)
        const syncMsgType = syncProtocol.readSyncMessage(
          decoder,
          replyEncoder,
          localDoc,
          null,
        )

        if (encoding.length(replyEncoder) > 1) {
          ws.send(encoding.toUint8Array(replyEncoder))
        }

        // After receiving SyncStep2, localDoc has the server's full state.
        // Now we can safely modify Y.Text — delete targets actual server items.
        if (
          syncMsgType === syncProtocol.messageYjsSyncStep2 &&
          !applied
        ) {
          applied = true

          // Snapshot the state vector before our change so we can compute a
          // minimal diff to send to the server.
          const beforeSV = Y.encodeStateVector(localDoc)

          const yCode = getSharedCode(localDoc)
          localDoc.transact(() => {
            if (yCode.length > 0) {
              yCode.delete(0, yCode.length)
            }
            if (newCode.length > 0) {
              yCode.insert(0, newCode)
            }
          })

          // Send only the diff (our delete + insert) as a SyncStep2 message
          const diff = Y.encodeStateAsUpdate(localDoc, beforeSV)
          const updateEncoder = encoding.createEncoder()
          encoding.writeVarUint(updateEncoder, messageSync)
          encoding.writeVarUint(updateEncoder, syncProtocol.messageYjsSyncStep2)
          encoding.writeVarUint8Array(updateEncoder, diff)
          ws.send(encoding.toUint8Array(updateEncoder))

          // Small delay to let the server process the update before closing
          setTimeout(() => finish({ ok: true }), 50)
        }
      } catch (err) {
        finish({ ok: false, error: `Protocol error: ${String(err)}` })
      }
    })

    ws.on('open', () => {
      // Initiate sync: send SyncStep1 (empty state vector) so the server
      // sends us its full state in SyncStep2.
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.writeSyncStep1(encoder, localDoc)
      ws.send(encoding.toUint8Array(encoder))
    })
  })
}
