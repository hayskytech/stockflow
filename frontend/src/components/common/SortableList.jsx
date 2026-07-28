import { useState } from "react"

/**
 * Headless native-HTML5-drag-and-drop reordering (no extra dependency) — returns per-row
 * drag handlers to spread onto whatever element the caller renders (e.g. a <tr>).
 * Calls `onReorder(newOrderedItems)` on drop; the caller persists the new order.
 */
export function useSortableList({ items, getId, onReorder }) {
  const [dragId, setDragId] = useState(null)

  function getDragHandlers(id) {
    return {
      draggable: true,
      onDragStart: () => setDragId(id),
      onDragOver: (e) => e.preventDefault(),
      onDrop: (e) => {
        e.preventDefault()
        if (dragId === null || dragId === id) return
        const fromIndex = items.findIndex((item) => getId(item) === dragId)
        const toIndex = items.findIndex((item) => getId(item) === id)
        if (fromIndex === -1 || toIndex === -1) return
        const next = [...items]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        onReorder(next)
        setDragId(null)
      },
      onDragEnd: () => setDragId(null),
    }
  }

  return { getDragHandlers, isDragging: (id) => dragId === id }
}

/** Drag-handle icon — put this in a leading table column to signal the row is draggable. */
export function DragHandle() {
  return <i className="fas fa-grip-vertical text-muted" style={{ cursor: "grab" }} />
}
