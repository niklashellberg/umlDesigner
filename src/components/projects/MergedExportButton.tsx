'use client'

import { useCallback, useState } from 'react'
import { exportMergedProject } from '@/lib/export/merged-project'

interface Props {
  projectTitle: string
  items: Array<{ diagramId: string }>
}

export function MergedExportButton({ projectTitle, items }: Props) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      await exportMergedProject(projectTitle, items)
    } finally {
      setIsExporting(false)
    }
  }, [projectTitle, items])

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="px-3 py-1.5 text-sm font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors disabled:opacity-50"
    >
      {isExporting ? 'Exporting...' : 'Export Merged'}
    </button>
  )
}
