import { notFound } from 'next/navigation'
import { getDiagram } from '@/lib/storage/diagrams'
import { getProjectForDiagram } from '@/lib/storage/projects'
import { DiagramEditor } from '@/components/editor/DiagramEditor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DiagramPage({ params }: Props) {
  const { id } = await params
  const diagram = await getDiagram(id)

  if (!diagram) {
    notFound()
  }

  const project = await getProjectForDiagram(id)

  return (
    <DiagramEditor
      diagram={diagram}
      projectId={project?.meta.id}
      projectTitle={project?.meta.title}
    />
  )
}
