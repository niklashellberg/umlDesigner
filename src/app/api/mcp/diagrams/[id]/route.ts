import { NextRequest, NextResponse } from 'next/server'
import { getDiagram, saveDiagram, deleteDiagram } from '@/lib/storage/diagrams'
import { pushCodeToYjs } from '@/lib/mcp/yjs-bridge'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const diagram = await getDiagram(id)

  if (!diagram) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(diagram)
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const diagram = await getDiagram(id)

  if (!diagram) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()

  if (body.title) diagram.meta.title = body.title
  if (body.nodes) diagram.nodes = body.nodes
  if (body.edges) diagram.edges = body.edges

  // Support both `code` (legacy) and `mermaidCode` field names
  const incomingCode: string | undefined = body.mermaidCode ?? body.code
  if (incomingCode !== undefined) {
    diagram.code = incomingCode
  }

  await saveDiagram(diagram)

  // If mermaid code changed, attempt to push the update into the live Yjs
  // document so any browser with the diagram open sees the change immediately.
  // This is best-effort — if the WS server is not running we still return OK.
  let yjsResult: { ok: boolean; error?: string } = { ok: true }
  if (incomingCode !== undefined) {
    yjsResult = await pushCodeToYjs(id, incomingCode)
    if (!yjsResult.ok) {
      console.warn(
        `[mcp] Yjs live-push skipped for diagram ${id}: ${yjsResult.error}`,
      )
    }
  }

  return NextResponse.json({
    ...diagram,
    _yjs: yjsResult.ok ? 'synced' : 'unavailable',
  })
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const deleted = await deleteDiagram(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
