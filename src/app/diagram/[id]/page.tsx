import { notFound } from 'next/navigation'
import { getDiagram } from '@/lib/storage/diagrams'
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

  return <DiagramEditor diagram={diagram} />
}
