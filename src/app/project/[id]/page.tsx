import { notFound } from 'next/navigation'
import { getProject } from '@/lib/storage/projects'
import { getDiagram } from '@/lib/storage/diagrams'
import { ProjectView } from '@/components/projects/ProjectView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params
  const project = await getProject(id)

  if (!project) {
    notFound()
  }

  // Enrich items with diagram details
  const enrichedItems = await Promise.all(
    project.items.map(async (item) => {
      const diagram = await getDiagram(item.diagramId)
      return {
        diagramId: item.diagramId,
        order: item.order,
        title: diagram?.meta.title ?? 'Unknown',
        type: diagram?.meta.type ?? 'class',
        updatedAt: diagram?.meta.updatedAt ?? '',
      }
    }),
  )

  return (
    <ProjectView
      projectId={project.meta.id}
      initialTitle={project.meta.title}
      initialItems={enrichedItems}
    />
  )
}
