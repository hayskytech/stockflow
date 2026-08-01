export function EmptyState({ icon = "fa-box-open", title = "Nothing here yet", description, action }) {
  return (
    <div className="text-center text-muted py-5">
      <i className={`fas ${icon} fa-3x mb-3`} />
      <h5>{title}</h5>
      {description ? <p className="mb-0">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
