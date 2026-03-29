import { NextRequest, NextResponse } from 'next/server'
import {
  addDiagramToProject,
  removeDiagramFromProject,
  reorderProjectItems,
} from '@/lib/storage/projects'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()
  const { diagramId } = body as { diagramId: string }

  if (!diagramId) {
    return NextResponse.json({ error: 'diagramId is required' }, { status: 400 })
  }

  const project = await addDiagramToProject(id, diagramId)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()
  const { items } = body as { items: Array<{ diagramId: string; order: number }> }

  if (!items) {
    return NextResponse.json({ error: 'items is required' }, { status: 400 })
  }

  const project = await reorderProjectItems(id, items)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()
  const { diagramId } = body as { diagramId: string }

  if (!diagramId) {
    return NextResponse.json({ error: 'diagramId is required' }, { status: 400 })
  }

  const project = await removeDiagramFromProject(id, diagramId)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}
