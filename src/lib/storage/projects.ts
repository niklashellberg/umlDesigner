import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Project, ProjectMeta, ProjectItem } from '@/lib/types/project'

const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.cwd(), 'data', 'projects')

async function ensureDir() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function projectPath(id: string) {
  if (!UUID_RE.test(id)) throw new Error(`Invalid project id: ${id}`)
  return path.join(PROJECTS_DIR, `${id}.json`)
}

export async function listProjects(): Promise<ProjectMeta[]> {
  await ensureDir()
  const files = await fs.readdir(PROJECTS_DIR)
  const projects: ProjectMeta[] = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const content = await fs.readFile(path.join(PROJECTS_DIR, file), 'utf-8')
      const project: Project = JSON.parse(content)
      projects.push(project.meta)
    } catch {
      // Skip malformed files
    }
  }

  return projects.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const content = await fs.readFile(projectPath(id), 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function saveProject(project: Project): Promise<void> {
  await ensureDir()
  project.meta.updatedAt = new Date().toISOString()
  await fs.writeFile(projectPath(project.meta.id), JSON.stringify(project, null, 2))
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    await fs.unlink(projectPath(id))
    return true
  } catch {
    return false
  }
}

export function createEmptyProject(title: string): Project {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  return {
    meta: { id, title, createdAt: now, updatedAt: now },
    items: [],
  }
}

export async function addDiagramToProject(projectId: string, diagramId: string): Promise<Project | null> {
  const project = await getProject(projectId)
  if (!project) return null

  // Don't add duplicate
  if (project.items.some((item) => item.diagramId === diagramId)) return project

  const nextOrder = project.items.length > 0
    ? Math.max(...project.items.map((i) => i.order)) + 1
    : 0

  project.items.push({ diagramId, order: nextOrder })
  await saveProject(project)
  return project
}

export async function removeDiagramFromProject(projectId: string, diagramId: string): Promise<Project | null> {
  const project = await getProject(projectId)
  if (!project) return null

  project.items = project.items
    .filter((item) => item.diagramId !== diagramId)
    .map((item, index) => ({ ...item, order: index }))

  await saveProject(project)
  return project
}

export async function reorderProjectItems(projectId: string, items: ProjectItem[]): Promise<Project | null> {
  const project = await getProject(projectId)
  if (!project) return null

  project.items = items
  await saveProject(project)
  return project
}

export async function getProjectForDiagram(diagramId: string): Promise<Project | null> {
  await ensureDir()
  const files = await fs.readdir(PROJECTS_DIR)

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const content = await fs.readFile(path.join(PROJECTS_DIR, file), 'utf-8')
      const project: Project = JSON.parse(content)
      if (project.items.some((item) => item.diagramId === diagramId)) {
        return project
      }
    } catch {
      // Skip malformed files
    }
  }

  return null
}
