import { useEffect, useState } from "react"

/** Returns `value`, but only updates it after `delay` ms have passed without `value`
 *  changing again — used to avoid firing a request on every keystroke. */
export function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
