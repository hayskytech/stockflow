export function PageHeader({ title, count, description, actions }) {
  return (
    <div className="content-header">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="m-0">
            {title}
            {typeof count === "number" ? ` (${count})` : ""}
          </h1>
          {description ? <p className="text-muted mb-0">{description}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
    </div>
  )
}
