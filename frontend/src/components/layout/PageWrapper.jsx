export function PageWrapper({ children }) {
  return (
    <div className="content">
      <div className="container-fluid">{children}</div>
    </div>
  )
}
