'use client'

import { useEffect } from 'react'
import type * as Y from 'yjs'

interface KeyboardShortcutOptions {
  onSave: () => void
  undoManager: Y.UndoManager | null
  /** Called when Delete/Backspace is pressed – deletes selected canvas elements */
  onDeleteSelected?: () => void
  /** Called when Escape is pressed – deselects all */
  onDeselect?: () => void
}

/**
 * Registers global keyboard shortcuts for the diagram editor.
 *
 * Ctrl/Cmd+S  → save
 * Ctrl/Cmd+Z  → undo (via Yjs UndoManager)
 * Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y → redo
 * Delete / Backspace → delete selected nodes/edges
 * Escape → deselect all
 *
 * All shortcuts are cleaned up when the component unmounts.
 */
export function useKeyboardShortcuts({
  onSave,
  undoManager,
  onDeleteSelected,
  onDeselect,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const ctrl = isMac ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd+S – save
      if (ctrl && e.key === 's') {
        e.preventDefault()
        onSave()
        return
      }

      // Ctrl/Cmd+Z – undo
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undoManager?.undo()
        return
      }

      // Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y – redo
      if ((ctrl && e.shiftKey && e.key === 'z') || (ctrl && e.key === 'y')) {
        e.preventDefault()
        undoManager?.redo()
        return
      }

      // Delete / Backspace – delete selected elements
      // Guard: don't fire if the user is typing in an input/textarea
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      if (!isTyping && (e.key === 'Delete' || e.key === 'Backspace')) {
        onDeleteSelected?.()
        return
      }

      // Escape – deselect all
      if (e.key === 'Escape') {
        onDeselect?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSave, undoManager, onDeleteSelected, onDeselect])
}
