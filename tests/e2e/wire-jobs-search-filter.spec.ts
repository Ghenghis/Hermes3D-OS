import { test, expect } from "@playwright/test";

const MOCK_JOBS = [
  { id: "j1", title: "test vase", status: "done", state: "COMPLETE" },
  { id: "j2", title: "benchy", status: "queued", state: "INTAKE" },
  { id: "j3", title: "test cube", status: "failed", state: "INTAKE" },
];

function workspacePayload(jobs: typeof MOCK_JOBS) {
  return {
    health: {},
    settings: {},
    printers: [],
    jobs,
    artifacts: [],
    approvals: [],
    events: [],
    autopilot: {},
  };
}

test.describe("Jobs tab: search + status filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/workspace", (route) =>
      route.fulfill({ json: workspacePayload(MOCK_JOBS) }),
    );
    // Stub individual job fetches so activeJob panel doesn't error
    await page.route("**/api/jobs/**", (route) =>
      route.fulfill({ json: { id: "j1", title: "test vase", state: "COMPLETE", description: "", artifacts: [], events: [] } }),
    );
    // Stub other parallel API calls
    await page.route("**/api/generation-stack/**", (route) => route.fulfill({ json: {} }));
    await page.route("**/api/learning-mode/**", (route) => route.fulfill({ json: {} }));
    await page.route("**/api/agentic-work/**", (route) => route.fulfill({ json: {} }));
    await page.route("**/api/providers/**", (route) => route.fulfill({ json: {} }));
    await page.goto("/");
    await page.locator('button[data-page="jobs"]').click();
    await expect(page.locator("#page-jobs")).toHaveClass(/active/);
    // Wait for jobs to render
    await expect(page.locator("#jobs .job-card")).toHaveCount(3);
  });

  test("search 'test' shows 2 matching jobs", async ({ page }) => {
    await page.fill("#jobsSearch", "test");
    await expect(page.locator("#jobs .job-card")).toHaveCount(2);
  });

  test("clearing search restores all 3 jobs", async ({ page }) => {
    await page.fill("#jobsSearch", "test");
    await expect(page.locator("#jobs .job-card")).toHaveCount(2);
    await page.fill("#jobsSearch", "");
    await expect(page.locator("#jobs .job-card")).toHaveCount(3);
  });

  test("clicking 'done' status chip shows 1 job", async ({ page }) => {
    await page.locator('.status-chip[data-status="done"]').click();
    await expect(page.locator("#jobs .job-card")).toHaveCount(1);
  });

  test("no chips pressed shows all statuses", async ({ page }) => {
    await expect(page.locator("#jobs .job-card")).toHaveCount(3);
  });
});
