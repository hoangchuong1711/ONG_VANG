import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/t24", fullyParallel: true, workers: 2, retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: [
    { command: "node tests/t24/proxy-fixture.mjs", url: "http://127.0.0.1:18082/ready", reuseExistingServer: false },
    { command: "npm run dev -- --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: false,
      env: { API_PROXY_TARGET: "http://127.0.0.1:18082", NEXT_TELEMETRY_DISABLED: "1" }, timeout: 120000 },
  ],
});
