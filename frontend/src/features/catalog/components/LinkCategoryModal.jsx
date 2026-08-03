import { useState } from "react"
import { Modal } from "@/components/ui/Modal"

/**
 * Moves one or more existing categories (currently under some other division) into this one,
 * by re-pointing each one's divisionId. Each selected category is linked independently via
 * `onLinkOne` — a name clash in one doesn't block the rest — and the outcome per category is
 * shown as a linked/skipped summary once the batch finishes.
 */
export function LinkCategoryModal({ open, categories, onClose, onLinkOne, isSubmitting }) {
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState([])
  const [result, setResult] = useState(null)

  const filtered = categories.filter((category) =>
    `${category.name} ${category.divisionName}`.toLowerCase().includes(search.toLowerCase()),
  )

  function handleClose() {
    setSearch("")
    setSelectedIds([])
    setResult(null)
    onClose()
  }

  function handleSelectChange(e) {
    setSelectedIds(Array.from(e.target.selectedOptions, (option) => option.value))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (selectedIds.length === 0) return

    const selectedCategories = categories.filter((category) => selectedIds.includes(category.id))
    const linked = []
    const skipped = []
    for (const category of selectedCategories) {
      try {
        await onLinkOne(category.id)
        linked.push(category)
      } catch (err) {
        skipped.push({ name: category.name, reason: err.response?.data?.message ?? "Could not link" })
      }
    }
    setSelectedIds([])
    setResult({ linked, skipped })
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      title="Link Existing Categories"
      onClose={handleClose}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            {result ? "Close" : "Cancel"}
          </button>
          {result ? null : (
            <button
              type="submit"
              form="link-category-form"
              id="link-category-submit-btn"
              className="btn btn-primary"
              disabled={isSubmitting || selectedIds.length === 0}
            >
              {isSubmitting ? "Linking…" : `Link${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
            </button>
          )}
        </>
      }
    >
      {result ? (
        <div id="link-category-result">
          <div className="alert alert-success">
            Linked {result.linked.length} categor{result.linked.length === 1 ? "y" : "ies"}.
          </div>
          {result.skipped.length > 0 ? (
            <div className="alert alert-warning py-2">
              <div className="mb-1">Skipped:</div>
              <ul className="mb-0 pl-3">
                {result.skipped.map((item, i) => (
                  <li key={i}>
                    {item.name} — {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <form id="link-category-form" onSubmit={handleSubmit}>
          <p className="text-muted">
            Pick one or more categories from other divisions to move them under this one. Hold Ctrl/Cmd (or Shift for a
            range) to select multiple.
          </p>
          <div className="form-group">
            <label htmlFor="link-category-search">Search</label>
            <input
              id="link-category-search"
              type="search"
              className="form-control mb-2"
              placeholder="Search categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              id="link-category-select"
              className="form-control"
              multiple
              size={8}
              value={selectedIds}
              onChange={handleSelectChange}
            >
              {filtered.length === 0 ? (
                <option value="" disabled>
                  No categories found
                </option>
              ) : (
                filtered.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} — currently under {category.divisionName}
                  </option>
                ))
              )}
            </select>
          </div>
        </form>
      )}
    </Modal>
  )
}
