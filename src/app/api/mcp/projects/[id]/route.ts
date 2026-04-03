import { NextRequest, NextResponse } from 'next/server'
import { getProject, saveProject, deleteProject } from '@/lib/storage/projects'
import { getDiagram } from '@/lib/storage/diagrams'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const project = await getProject(id)

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Enrich items with diagram details
  const enrichedItems = await Promise.all(
    project.items.map(async (item) => {
      const diagram = await getDiagram(item.diagramId)
      return {
        ...item,
        title: diagram?.meta.title ?? 'Unknown',
        type: diagram?.meta.type ?? 'class',
        updatedAt: diagram?.meta.updatedAt ?? '',
      }
    }),
  )

  return NextResponse.json({ ...project, items: enrichedItems })
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const project = await getProject(id)

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()

  if (body.title) project.meta.title = body.title
  if (body.items) project.items = body.items

  await saveProject(project)

  return NextResponse.json(project)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const deleted = await deleteProject(id)

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
