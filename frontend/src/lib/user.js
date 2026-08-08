/**
 * What to call a user on screen.
 *
 * Signing in with an OTP creates the account from a verified phone number alone, so a real
 * customer can exist with no name and no email until they fill in their profile. Their phone
 * number is the only thing that identifies them until then — and it is the thing staff would
 * recognise them by anyway — so it stands in for the name rather than leaving a blank cell.
 */
export function userDisplayName(user) {
  return user?.name || user?.phone || "Unnamed customer"
}
