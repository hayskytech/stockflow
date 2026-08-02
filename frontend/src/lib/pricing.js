/** What the customer actually pays: price minus discountPercent, rounded to paise/cents. */
export function effectivePrice(price, discountPercent) {
  return Math.round(Number(price) * (1 - Number(discountPercent) / 100) * 100) / 100
}

/** What one full set costs — effectivePrice() multiplied by how many pieces are in a set. */
export function setEffectivePrice(price, discountPercent, piecesPerSet) {
  return effectivePrice(price, discountPercent) * Number(piecesPerSet)
}
