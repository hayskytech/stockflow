import { test as base, expect } from "@playwright/test"
import { LoginPage } from "../pages/login.page.js"

export const test = base.extend({
  adminPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD)
    await page.waitForURL(/\/dashboard$/)
    await use(page)
  },

  staffPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(process.env.TEST_STAFF_EMAIL, process.env.TEST_STAFF_PASSWORD)
    await page.waitForURL(/\/dashboard$/)
    await use(page)
  },
})

export { expect }
