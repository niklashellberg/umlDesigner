/**
 * MCP-to-Yjs bridge: server-side utility that connects to the y-websocket
 * server as a transient client, pushes a document update, then disconnects.
 *
 * This is intentionally low-level — it uses the raw ws package (which is
 * available server-side) together with y-protocols and lib0 encoding,
 * mirroring the same protocol that ws-server.ts speaks.
 *
 * Flow:
 *   1. Open a WebSocket to ws://localhost:4444/<roomName>
 *   2. Receive SyncStep1 from the server, reply with SyncStep2 (our update)
 *   3. Send our own SyncStep1 + SyncStep2 so the server merges our changes
 *   4. Wait for the server's SyncStep2 (confirmation), then close
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
    // Build a local Y.Doc containing only the new code so we can encode a
    // state update to send to the server.
    const localDoc = new Y.Doc()
    const yCode = getSharedCode(localDoc)

    localDoc.transact(() => {
      if (yCode.length > 0) {
        yCode.delete(0, yCode.length)
      }
      yCode.insert(0, newCode)
    })

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

    // Track whether we have sent our own update yet
    let sentUpdate = false

    ws.on('message', (raw) => {
      try {
        let data: Uint8Array
        if (raw instanceof Buffer) {
          data = new Uint8Array(raw)
        } else if (raw instanceof ArrayBuffer) {
          data = new Uint8Array(raw)
        } else if (Array.isArray(raw)) {
          // Buffer[] — concatenate
          data = new Uint8Array(Buffer.concat(raw as Buffer[]))
        } else {
          // Fallback: treat as Buffer (ws always gives Buffer in Node.js)
          data = new Uint8Array(Buffer.from(raw as unknown as ArrayBuffer))
        }

        const decoder = decoding.createDecoder(data)
        const msgType = decoding.readVarUint(decoder)

        if (msgType !== messageSync) {
          // Ignore awareness or other messages
          return
        }

        const syncMsgType = decoding.readVarUint(decoder)

        if (syncMsgType === syncProtocol.messageYjsSyncStep1) {
          // Server sent us SyncStep1 — reply with SyncStep2 (our full state)
          const replyEncoder = encoding.createEncoder()
          encoding.writeVarUint(replyEncoder, messageSync)
          syncProtocol.writeSyncStep2(replyEncoder, localDoc)
          ws.send(encoding.toUint8Array(replyEncoder))

          if (!sentUpdate) {
            // Also send our own SyncStep1 so the server sends us its state
            const step1Encoder = encoding.createEncoder()
            encoding.writeVarUint(step1Encoder, messageSync)
            syncProtocol.writeSyncStep1(step1Encoder, localDoc)
            ws.send(encoding.toUint8Array(step1Encoder))
            sentUpdate = true
          }
        } else if (syncMsgType === syncProtocol.messageYjsSyncStep2) {
          // Server sent us its full state — sync is complete
          finish({ ok: true })
        } else if (syncMsgType === syncProtocol.messageYjsUpdate) {
          // Server broadcast an incremental update — apply it and we're done
          const update = decoding.readVarUint8Array(decoder)
          Y.applyUpdate(localDoc, update)
          finish({ ok: true })
        }
      } catch (err) {
        finish({ ok: false, error: `Protocol error: ${String(err)}` })
      }
    })

    ws.on('open', () => {
      // Initiate sync: send SyncStep1 to the server
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.writeSyncStep1(encoder, localDoc)
      ws.send(encoding.toUint8Array(encoder))
    })
  })
}
