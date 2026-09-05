import { test as base, expect } from "@playwright/test"
import { LoginPage } from "../pages/login.page.js"

/**
 * Multi-tenant fixture shape (multitenant_plan.md Phase 8)
 * --------------------------------------------------------
 * Post-login the app lands on `/` → RootRedirect:
 *   - a user who belongs to exactly one business  → `/#/b/<id>/dashboard`
 *   - a super admin (or multi-business user)      → `/#/businesses` (the picker)
 *
 * Seed logins (password `NewPassword@123` for all):
 *   - admin@example.com  — platform super admin + admin of BOTH seed businesses → picker
 *   - staff@example.com  — staff of "Default Business" only                     → that dashboard
 *   - demo.admin@example.com — admin of "Demo Cloth Co" only
 *
 * Seed businesses: `default` = DEFAULT_BUSINESS_ID, `demo-cloth-co` = DEMO_BUSINESS_ID.
 *
 * How `businessId` reaches tests
 * ------------------------------
 * `businessId` is a plain fixture that resolves to DEFAULT_BUSINESS_ID (the "Default Business"
 * seed UUID). Both `adminPage` and `staffPage` operate *inside that same business* — `adminPage`
 * navigates into it from the picker, `staffPage` lands there directly and we assert the id.
 * Tests destructure whatever they need, e.g.:
 *
 *   test("...", async ({ adminPage: page, businessId }) => {
 *     const products = new ProductsPage(page, businessId)   // page objects take businessId
 *     await products.goto()                                 // → /#/b/<businessId>/products
 *   })
 *
 * `superAdminPage` stays on the picker (`/#/businesses`) without entering a business — use it
 * for the platform-area specs (`/#/admin/businesses`, `/#/admin/users`, `/#/admin/sessions`).
 */
export const DEFAULT_BUSINESS_ID = "b0000000-0000-4000-8000-000000000001"
export const DEMO_BUSINESS_ID = "b0000000-0000-4000-8000-000000000002"

/** URL regex for "we are on some business's dashboard". */
const BUSINESS_DASHBOARD_RE = /\/#\/b\/[0-9a-f-]+\/dashboard$/
/** URL regex for the business picker. */
const BUSINESS_PICKER_RE = /\/#\/businesses$/

export const test = base.extend({
  // Plain, synchronous fixture — the Default Business seed id. No auth here; pair it with
  // `adminPage` / `staffPage` for a logged-in session in that business.
  businessId: async ({}, use) => {
    await use(DEFAULT_BUSINESS_ID)
  },

  // Super admin, logged in, sitting on the business picker (no business entered).
  superAdminPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD)
    await page.waitForURL(BUSINESS_PICKER_RE)
    await use(page)
  },

  // Super admin, logged in, then stepped into the Default Business dashboard.
  adminPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD)
    await page.waitForURL(BUSINESS_PICKER_RE)
    // Enter the Default Business (direct nav is more robust than clicking a card).
    await page.goto(`/#/b/${DEFAULT_BUSINESS_ID}/dashboard`)
    await page.waitForURL(new RegExp(`/#/b/${DEFAULT_BUSINESS_ID}/dashboard$`))
    await use(page)
  },

  // Staff of the Default Business — one membership, so login lands straight on its dashboard.
  staffPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(process.env.TEST_STAFF_EMAIL, process.env.TEST_STAFF_PASSWORD)
    await page.waitForURL(BUSINESS_DASHBOARD_RE)
    // Sanity: staff@example.com is a member of exactly the Default Business.
    expect(page.url()).toContain(`/b/${DEFAULT_BUSINESS_ID}/`)
    await use(page)
  },
})

export { expect }
