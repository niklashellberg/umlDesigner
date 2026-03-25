import { NextRequest, NextResponse } from 'next/server'
import { getDiagram, saveDiagram, deleteDiagram } from '@/lib/storage/diagrams'

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

  // NOTE: We intentionally do NOT call pushCodeToYjs here.
  // The browser is already connected to the Yjs room and keeps Y.Text in sync.
  // Pushing from the server-side would create a fresh Y.Doc with a new clientId,
  // causing CRDT to merge both inserts (doubling the content on every save).
  // The MCP tool `update_diagram_code` handles its own Yjs push for API-driven changes.

  return NextResponse.json(diagram)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const deleted = await deleteDiagram(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
