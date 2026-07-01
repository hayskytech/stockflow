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
    return {
      sel,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      zIndex: cs.zIndex,
      position: cs.position,
      text: el.textContent,
    }
  }
  return [
    describe(".uppy-Dashboard-AddFiles-title"),
    describe(".uppy-Dashboard-browse"),
    describe(".uppy-Dashboard-dropFilesHereHint"),
  ]
})
console.log(JSON.stringify(info, null, 2))

// check stylesheets loaded
const sheets = await page.evaluate(() => Array.from(document.styleSheets).map(s => s.href || "(inline)"))
console.log("STYLESHEETS:", JSON.stringify(sheets, null, 2))

await page.locator(".uppy-Dashboard-AddFiles").screenshot({ path: "_tmp-addfiles.png" })

await browser.close()
