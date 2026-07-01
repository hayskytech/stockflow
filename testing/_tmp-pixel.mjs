import { chromium } from "playwright"

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" })
await page.fill('input[placeholder="Email"]', "admin@stockflow.local")
await page.fill('input[placeholder="Password"]', "Admin@1234")
await page.click('button[type="submit"]')
await page.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {})
await page.waitForTimeout(500)

await page.goto("http://localhost:5173/products/new", { waitUntil: "networkidle" })
await page.waitForSelector("text=Choose image", { timeout: 15000 })
await page.click("text=Choose image")
await page.waitForTimeout(500)
await page.click("text=Upload New")
await page.waitForTimeout(2000)

const info = await page.evaluate(() => {
  function chain(sel) {
    const el = document.querySelector(sel)
    const out = []
    let node = el
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node)
      out.push({
        tag: node.tagName,
        cls: node.className,
        overflow: cs.overflow,
        clipPath: cs.clipPath,
        filter: cs.filter,
        opacity: cs.opacity,
        transform: cs.transform,
        contain: cs.contain,
        contentVisibility: cs.contentVisibility,
        colorScheme: cs.colorScheme,
        fontFamily: cs.fontFamily,
      })
      node = node.parentElement
    }
    return out
  }
  return chain(".uppy-Dashboard-browse")
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
