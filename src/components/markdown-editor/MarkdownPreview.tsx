'use client'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDiagramStore } from '@/lib/store/diagram-store'

export function MarkdownPreview() {
  const markdown = useDiagramStore((s) => s.markdown)

  if (!markdown.trim()) {
    return (
      <div className="flex h-full items-center justify-center text-muted text-sm">
        <p className="text-center">
          No documentation yet.
          <br />
          <span className="text-xs opacity-70">Switch to Edit mode to start writing.</span>
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-none
        [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-4 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-border
        [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-3 [&_h2]:mt-6
        [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-2 [&_h3]:mt-5
        [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mb-2 [&_h4]:mt-4
        [&_p]:text-sm [&_p]:text-foreground/85 [&_p]:mb-3 [&_p]:leading-relaxed
        [&_ul]:text-sm [&_ul]:text-foreground/85 [&_ul]:mb-3 [&_ul]:pl-6 [&_ul]:list-disc
        [&_ol]:text-sm [&_ol]:text-foreground/85 [&_ol]:mb-3 [&_ol]:pl-6 [&_ol]:list-decimal
        [&_li]:mb-1
        [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80
        [&_code]:text-xs [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-accent [&_code]:font-mono
        [&_pre]:bg-surface [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border/50
        [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:py-0 [&_pre_code]:text-foreground/85
        [&_blockquote]:border-l-2 [&_blockquote]:border-accent/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted [&_blockquote]:mb-3
        [&_table]:w-full [&_table]:text-sm [&_table]:mb-3
        [&_thead]:border-b [&_thead]:border-border
        [&_th]:text-left [&_th]:py-2 [&_th]:px-3 [&_th]:font-semibold [&_th]:text-foreground
        [&_td]:py-2 [&_td]:px-3 [&_td]:text-foreground/85 [&_td]:border-b [&_td]:border-border/50
        [&_hr]:border-border [&_hr]:my-6
        [&_strong]:font-semibold [&_strong]:text-foreground
        [&_em]:italic
      ">
        <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
      </div>
    </div>
  )
}
