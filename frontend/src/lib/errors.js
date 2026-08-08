/**
 * Turns an axios rejection into a message safe to show in a form.
 * A rejection with no `response` is a transport failure (server down, DNS, offline) rather than
 * an API error, and gets its own wording — `fallback` only covers a response whose body carried
 * no message of its own.
 */
export function apiErrorMessage(err, fallback) {
  if (!err?.response) {
    return "Could not reach the server. Please check your connection and try again."
  }
  return err.response.data?.message ?? fallback
}
