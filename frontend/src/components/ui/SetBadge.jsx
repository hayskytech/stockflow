/** Shown for a product sold as a bundle of physical pieces (e.g. "Set of 3"). Caller guards on piecesPerSet > 1. */
export function SetBadge({ piecesPerSet }) {
  return <span className="badge badge-info">Set of {piecesPerSet}</span>
}
