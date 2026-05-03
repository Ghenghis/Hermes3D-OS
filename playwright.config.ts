import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:18081",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // The FastAPI app at apps/api/hermes3d_api/main.py mounts apps/web at /static
  // and serves apps/web/index.html at /, so a single uvicorn covers both GUI + API.
  webServer: [
    {
      command: "python -m uvicorn apps.api.hermes3d_api.main:app --host 127.0.0.1 --port 18081",
      url: "http://127.0.0.1:18081/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
