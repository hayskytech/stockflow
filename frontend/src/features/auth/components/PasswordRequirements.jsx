const RULES = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /[0-9]/.test(v) },
  { label: "One special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
]

/** Live checklist of the password policy — every rule is shown at once and turns green as it's met. */
export function PasswordRequirements({ value }) {
  return (
    <ul className="list-unstyled small mb-3">
      {RULES.map((rule) => {
        const met = rule.test(value)
        return (
          <li key={rule.label} className={met ? "text-success" : "text-muted"}>
            <i className={`fas ${met ? "fa-check-circle" : "fa-circle"} mr-2`} />
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
