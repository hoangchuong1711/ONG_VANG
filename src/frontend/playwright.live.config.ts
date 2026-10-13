import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/t24-live", workers: 1, retries: 0, timeout: 60000,
  reporter: [["list"], ["html", { outputFolder: "playwright-report/live", open: "never" }]],
  // Auth requests contain test credentials; keep live traces/screenshots disabled.
  use: { baseURL: "http://127.0.0.1:3101", trace: "off", screenshot: "off", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  projects: [{ name: "live-desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev -- --hostname 127.0.0.1 --port 3101", url: "http://127.0.0.1:3101", reuseExistingServer: false,
    env: { API_PROXY_TARGET: process.env.API_BASE_URL ?? "http://127.0.0.1:18081", NEXT_TELEMETRY_DISABLED: "1" }, timeout: 120000 },
});
