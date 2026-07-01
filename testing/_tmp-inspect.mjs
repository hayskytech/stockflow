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
  function describe(sel) {
    const el = document.querySelector(sel)
    if (!el) return { sel, found: false }
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return {
      sel,
      found: true,
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      width: rect.width,
      height: rect.height,
      overflow: cs.overflow,
      innerHTMLLength: el.innerHTML.length,
    }
  }
  return [
    describe(".uppy-Container"),
    describe(".uppy-Dashboard"),
    describe(".uppy-Dashboard-inner"),
    describe(".uppy-Dashboard-AddFiles"),
    describe(".uppy-Dashboard-browse"),
    describe(".uppy-Dashboard-AddFiles-title"),
  ]
})
console.log(JSON.stringify(info, null, 2))

await browser.close()
