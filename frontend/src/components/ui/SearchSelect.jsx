import { useEffect, useMemo, useRef, useState } from "react"

/**
 * In-house searchable dropdown (plain Bootstrap markup + JS filtering, no external
 * combobox library — see CLAUDE.md's "no UI form-primitive library" form rule).
 * `options` is [{ value, label }]. Behaves like a controlled <select>.
 */
export function SearchSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Search…",
  disabled = false,
  emptyLabel = "No matches",
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef(null)

  const selectedOption = options.find((o) => String(o.value) === String(value)) ?? null

  const filtered = useMemo(() => {
    if (!query) return options
    const q = query.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) return undefined
    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [open])

  function selectOption(option) {
    onChange(option.value)
    setOpen(false)
    setQuery("")
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (open && filtered[highlightedIndex]) selectOption(filtered[highlightedIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
      setQuery("")
    }
  }

  return (
    <div className="dropdown" ref={containerRef}>
      <input
        id={id}
        type="text"
        className="form-control"
        placeholder={selectedOption ? selectedOption.label : placeholder}
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value)
          setHighlightedIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open ? (
        <div
          className="dropdown-menu d-block w-100 shadow-sm"
          style={{ maxHeight: 240, overflowY: "auto" }}
        >
          {selectedOption ? (
            <button
              type="button"
              className="dropdown-item text-muted small"
              onClick={() => {
                onChange("")
                setOpen(false)
                setQuery("")
              }}
            >
              Clear selection
            </button>
          ) : null}
          {filtered.length === 0 ? (
            <span className="dropdown-item-text text-muted">{emptyLabel}</span>
          ) : (
            filtered.map((option, index) => (
              <button
                key={option.value}
                type="button"
                className={`dropdown-item ${index === highlightedIndex ? "active" : ""} ${
                  String(option.value) === String(value) ? "font-weight-bold" : ""
                }`}
                onClick={() => selectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
