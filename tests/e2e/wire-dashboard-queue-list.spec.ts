import { test, expect } from "@playwright/test";

test("dashboard queue: click job card opens Action Window", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({
      json: {
        health: { dry_run_printers: true },
        settings: {},
        printers: [],
        jobs: [{ id: 1, title: "Test Job", state: "queued", target_printer_id: null }],
        artifacts: [],
        approvals: [],
        events: [],
        autopilot: {},
      },
    })
  );
  // Stub out extra API calls that app.js fires in parallel so they don't 404-throw
  await page.route("**/api/generation-stack/status", route => route.fulfill({ json: {} }));
  await page.route("**/api/learning-mode/status", route => route.fulfill({ json: {} }));
  await page.route("**/api/agentic-work/status", route => route.fulfill({ json: {} }));
  await page.route("**/api/providers/status", route => route.fulfill({ json: {} }));

  await page.goto("/");

  // Navigate to dashboard tab
  await page.click('[data-page="dashboard"]');

  // Wait for a job card to appear in the dashboard queue panel
  await page.waitForSelector("#dashboardJobs .job-card");

  // Click the job card
  await page.click("#dashboardJobs .job-card");

  // Action Window should become visible
  await expect(page.locator("#actionWindow")).toBeVisible();

  // Verify it was opened with kind=job
  await expect(page.locator("#actionWindow")).toHaveAttribute("data-kind", "job");
  await expect(page.locator("#actionWindow")).toHaveAttribute("data-tab-id", "dashboard");

  // Title should match the job title
  await expect(page.locator("#actionWindow .action-window__title")).toHaveText("Test Job");
});
