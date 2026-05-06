import { defineConfig, devices } from "@playwright/test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadDotEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return {}
  }

  const envEntries: Record<string, string> = {}
  const lines = readFileSync(filePath, "utf-8").split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) {
      continue
    }

    const separatorIndex = line.indexOf("=")
    if (separatorIndex <= 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "")
    envEntries[key] = value
  }

  return envEntries
}

const e2eEnvPath = resolve(process.cwd(), ".env.e2e")
const e2eEnv = loadDotEnvFile(e2eEnvPath)

for (const [key, value] of Object.entries(e2eEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value
  }
}

const baseURL = process.env.BASE_URL ?? process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000"
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1"

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/{api,e2e}/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/playwright-results.json" }],
    ["junit", { outputFile: "test-results/playwright-junit.xml" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: "pnpm exec next dev --hostname 127.0.0.1",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...process.env,
          OPENAI_API_KEY: "",
          OPENAI_MODEL: "",
          STRAVA_CLIENT_ID: "",
          STRAVA_CLIENT_SECRET: "",
          NEXT_PUBLIC_STRAVA_CLIENT_ID: "",
          STRAVA_WEBHOOK_VERIFY_TOKEN: "playwright-token",
          NEXT_PUBLIC_APP_URL: baseURL,
        },
      },
  projects: [
    {
      name: "chromium",
      testIgnore: ["**/*.setup.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testIgnore: ["**/*.setup.ts"],
      use: { ...devices["Pixel 5"] },
    },
  ],
})
