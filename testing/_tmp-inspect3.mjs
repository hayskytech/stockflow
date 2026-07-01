import { chromium } from "playwright"

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" })
await page.fill('input[placeholder="Email"]', "admin@stockflow.local")
await page.fill('input[placeholder="Password"]', "Admin@1234")
await page.click('button[type="submit"]')
await page.waitForTimeout(1500)

await page.goto("http://localhost:5173/products/new", { waitUntil: "networkidle" })
await page.waitForTimeout(1000)
await page.click("text=Choose image")
await page.waitForTimeout(500)
await page.click("text=Upload New")
await page.waitForTimeout(1000)

const info = await page.evaluate(() => {
  const root = document.querySelector(".uppy-Dashboard-inner")
  const all = root.querySelectorAll("*")
  const results = []
  for (const el of all) {
    const cs = getComputedStyle(el)
    if (cs.position === "absolute" || cs.position === "fixed" || parseFloat(cs.zIndex) > 0 || cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
      const rect = el.getBoundingClientRect()
      results.push({
        tag: el.tagName,
        cls: el.className,
        position: cs.position,
        zIndex: cs.zIndex,
        bg: cs.backgroundColor,
        display: cs.display,
        visibility: cs.visibility,
        w: rect.width,
        h: rect.height,
      })
    }
  }
  return results
})
console.log(JSON.stringify(info, null, 2))

await browser.close()
