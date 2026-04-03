import { listDiagrams } from '@/lib/storage/diagrams'
import { listProjects } from '@/lib/storage/projects'
import { getProject } from '@/lib/storage/projects'
import { CreateDiagramButton } from '@/components/diagrams/CreateDiagramButton'
import { DiagramCard } from '@/components/diagrams/DiagramCard'
import { EmptyState } from '@/components/diagrams/EmptyState'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectButton } from '@/components/projects/CreateProjectButton'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [diagrams, projectMetas] = await Promise.all([
    listDiagrams(),
    listProjects(),
  ])

  // Load full projects to get item counts and grouped diagram IDs
  const projects = await Promise.all(
    projectMetas.map(async (meta) => {
      const full = await getProject(meta.id)
      return {
        meta,
        itemCount: full?.items.length ?? 0,
        diagramIds: new Set(full?.items.map((i) => i.diagramId) ?? []),
      }
    }),
  )

  // Compute the set of all diagram IDs that belong to a project
  const groupedDiagramIds = new Set<string>()
  for (const p of projects) {
    for (const id of p.diagramIds) {
      groupedDiagramIds.add(id)
    }
  }

  const ungroupedDiagrams = diagrams.filter((d) => !groupedDiagramIds.has(d.id))
  const hasProjects = projects.length > 0

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">UML Designer</h1>
          <p className="text-sm text-muted">Interactive diagrams with AI assistance</p>
        </div>
        <div className="flex gap-2">
          <CreateProjectButton />
          <CreateDiagramButton />
        </div>
      </header>

      <div className="flex-1 p-6 space-y-8">
        {/* Projects section */}
        {hasProjects && (
          <section>
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((p) => (
                <ProjectCard key={p.meta.id} project={p.meta} itemCount={p.itemCount} />
              ))}
            </div>
          </section>
        )}

        {/* Diagrams section */}
        <section>
          {hasProjects && (
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
              Ungrouped Diagrams
            </h2>
          )}
          {ungroupedDiagrams.length === 0 && !hasProjects ? (
            <EmptyState />
          ) : ungroupedDiagrams.length === 0 ? (
            <p className="text-sm text-muted">All diagrams are assigned to projects.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ungroupedDiagrams.map((diagram) => (
                <DiagramCard key={diagram.id} diagram={diagram} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
