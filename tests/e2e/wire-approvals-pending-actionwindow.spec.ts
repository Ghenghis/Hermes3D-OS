import { test, expect } from "@playwright/test";

test("approvals tab: pending list from API, click row opens Action Window with Approve + Reject", async ({
  page,
}) => {
  const pendingApprovals = [
    { id: "ap1", kind: "print", summary: "Approve Vase Print", requester: "auto-agent" },
  ];

  await page.route("**/api/approvals/pending", (route) =>
    route.fulfill({ json: pendingApprovals }),
  );

  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      json: {
        health: {},
        settings: {},
        printers: [],
        jobs: [],
        artifacts: [],
        approvals: [
          { id: "ap1", kind: "print", summary: "Approve Vase Print", requester: "auto-agent" },
        ],
        events: [],
        autopilot: {},
      },
    }),
  );

  await page.goto("/");

  // Navigate to approvals tab
  await page.click('[data-page="approvals"]');
  await expect(page.locator("#page-approvals")).toHaveClass(/active/);

  // Wait for the pending row to appear
  await page.waitForSelector(".approval-row");

  // Click the first approval row
  await page.click(".approval-row");

  // Action Window should be visible with Approve and Reject buttons
  await expect(page.locator("#actionWindow")).toBeVisible();
  await expect(page.locator("#actionWindow")).toContainText("Approve");
  await expect(page.locator("#actionWindow")).toContainText("Reject");
});

test("approvals tab: empty pending list shows empty state", async ({ page }) => {
  await page.route("**/api/approvals/pending", (route) =>
    route.fulfill({ json: [] }),
  );

  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      json: {
        health: {},
        settings: {},
        printers: [],
        jobs: [],
        artifacts: [],
        approvals: [],
        events: [],
        autopilot: {},
      },
    }),
  );

  await page.goto("/");

  await page.click('[data-page="approvals"]');
  await expect(page.locator("#page-approvals")).toHaveClass(/active/);

  await expect(page.locator(".empty-state")).toContainText("No pending approvals.");
});
