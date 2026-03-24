import { listDiagrams } from '@/lib/storage/diagrams'
import { CreateDiagramButton } from '@/components/diagrams/CreateDiagramButton'
import { DiagramCard } from '@/components/diagrams/DiagramCard'
import { EmptyState } from '@/components/diagrams/EmptyState'

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
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {diagrams.map((diagram) => (
              <DiagramCard key={diagram.id} diagram={diagram} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
