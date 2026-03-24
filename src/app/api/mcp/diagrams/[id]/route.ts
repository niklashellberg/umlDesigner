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
  if (body.code) diagram.code = body.code
  if (body.nodes) diagram.nodes = body.nodes
  if (body.edges) diagram.edges = body.edges

  await saveDiagram(diagram)
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
