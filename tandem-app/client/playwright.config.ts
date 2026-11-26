import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 15000,
    reducedMotion: "reduce",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: [
    {
      command: "npm start",
      cwd: "../server",
      url: "http://localhost:3001/health",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "npm run dev -- --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 30000,
      env: process.env["LIVE_AI"] === "1" ? {} : { VITE_E2E: "1" },
    },
  ],
  timeout: 45000,
});