import { NextRequest, NextResponse } from 'next/server'
import { listProjects, saveProject, createEmptyProject } from '@/lib/storage/projects'

export async function GET() {
  const projects = await listProjects()
  return NextResponse.json(projects)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title = 'Untitled Project' } = body as { title?: string }

  const project = createEmptyProject(title)
  await saveProject(project)

  return NextResponse.json({ id: project.meta.id }, { status: 201 })
}
