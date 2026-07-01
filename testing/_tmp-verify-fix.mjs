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

const opacity = await page.evaluate(() => {
  const el = document.querySelector(".uppy-Dashboard-innerWrap")
  return getComputedStyle(el).opacity
})
console.log("innerWrap opacity:", opacity)

await page.screenshot({ path: "_tmp-after-fix.png" })
await browser.close()
