/** What the customer actually pays: price minus discount_percent, rounded to paise/cents. */
export function effectivePrice(price, discountPercent) {
  return Math.round(Number(price) * (1 - Number(discountPercent) / 100) * 100) / 100;
}
