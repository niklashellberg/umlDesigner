import Link from 'next/link'
import { listDiagrams } from '@/lib/storage/diagrams'
import { CreateDiagramButton } from '@/components/diagrams/CreateDiagramButton'
import { DiagramCard } from '@/components/diagrams/DiagramCard'

export default async function HomePage() {
  const diagrams = await listDiagrams()

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">UML Designer</h1>
          <p className="text-sm text-muted">Interactive diagrams with AI assistance</p>
        </div>
        <CreateDiagramButton />
      </header>

      <div className="flex-1 p-6">
        {diagrams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4 opacity-20">&#9649;</div>
            <h2 className="text-lg font-medium mb-1">No diagrams yet</h2>
            <p className="text-sm text-muted mb-4">
              Create your first UML diagram to get started
            </p>
            <CreateDiagramButton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {diagrams.map((diagram) => (
              <Link key={diagram.id} href={`/diagram/${diagram.id}`}>
                <DiagramCard diagram={diagram} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
