'use client'
import { type ReactNode } from 'react'

type Tab = 'code' | 'docs'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: ReactNode
}

export function CodePanelTabs({ activeTab, onTabChange, children }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-0.5 px-3 py-1.5 border-b border-border bg-background/50 shrink-0">
        {(['code', 'docs'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${
              activeTab === tab
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {tab === 'code' ? 'Code' : 'Docs'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
