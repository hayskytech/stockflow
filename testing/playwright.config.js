import { defineConfig, devices } from "@playwright/test"
import dotenv from "dotenv"

dotenv.config({ path: ".env.test" })

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.FRONTEND_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    cwd: "../frontend",
    url: process.env.FRONTEND_URL ?? "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
