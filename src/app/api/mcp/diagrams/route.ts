import { NextRequest, NextResponse } from 'next/server'
import { listDiagrams, saveDiagram, createEmptyDiagram } from '@/lib/storage/diagrams'
import type { DiagramType } from '@/lib/types/diagram'

export async function GET() {
  const diagrams = await listDiagrams()
  return NextResponse.json(diagrams)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title = 'Untitled Diagram', type = 'class' } = body as {
    title?: string
    type?: DiagramType
  }

  const diagram = createEmptyDiagram(title, type)
  await saveDiagram(diagram)

  return NextResponse.json({ id: diagram.meta.id }, { status: 201 })
}
