import { chromium } from "playwright"

const browser = await chromium.launch()
const page = await browser.newPage()
const logs = []
page.on("console", (msg) => logs.push(`[console] ${msg.text()}`))
page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`))

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

const browseBtnCount = await page.locator(".uppy-Dashboard-browse").count()
const addFilesCount = await page.locator(".uppy-Dashboard-AddFiles").count()
const modalCount = await page.locator(".modal").count()

console.log("modalCount:", modalCount)
console.log("browseBtnCount:", browseBtnCount)
console.log("addFilesCount:", addFilesCount)
console.log("LOGS:\n" + logs.join("\n"))

await page.screenshot({ path: "_tmp-upload-check.png", fullPage: true })
await browser.close()
