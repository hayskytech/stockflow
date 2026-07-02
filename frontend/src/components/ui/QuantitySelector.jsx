/** Bootstrap-styled numeric stepper — controlled via `value`/`onChange`, shared across storefront features. */
export function QuantitySelector({ id, value, min = 1, max, onChange }) {
  const canDecrease = value > min
  const canIncrease = max === undefined || value < max

  return (
    <div className="input-group input-group-sm" style={{ width: "120px" }}>
      <div className="input-group-prepend">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => onChange(value - 1)}
          disabled={!canDecrease}
        >
          &minus;
        </button>
      </div>
      <input id={id} type="text" className="form-control text-center" value={value} readOnly />
      <div className="input-group-append">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => onChange(value + 1)}
          disabled={!canIncrease}
        >
          +
        </button>
      </div>
    </div>
  )
}
