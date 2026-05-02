import { test, expect } from "@playwright/test";
import {
  ensureTestUser,
  signIn,
  stubConversationApis,
} from "./_helpers";

test.beforeAll(async ({ request }) => {
  await ensureTestUser(request);
});

test.beforeEach(async ({ page }) => {
  await stubConversationApis(page);
});

test("ghost mode toggle persists to localStorage and reflects on profile", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/v2/ghost");

  await page.getByText(/currently saving entries/i).waitFor();
  // The toggle is the only h-16 w-32 rounded-full button on the page.
  await page.locator(".h-16.w-32.rounded-full").click();
  await expect(page.getByText(/ghost mode is on/i)).toBeVisible();

  // Persists to localStorage
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("sage-ghost-mode")
  );
  expect(stored).toBe("1");

  // Profile shows the right-side label "on" next to the ghost-mode row.
  await page.goto("/v2/profile");
  const ghostRow = page.getByRole("link", { name: /ghost mode/i });
  await expect(ghostRow).toBeVisible();
  // Right label "on" is rendered inside the same anchor.
  await expect(ghostRow).toContainText(/on/i);
});

test("feedback form submits and shows the sent state", async ({ page }) => {
  // Stub the endpoint so we don't actually write to the DB during tests
  await page.route("**/api/feedback", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, id: "fb_test" }),
    });
  });

  await signIn(page);
  await page.goto("/v2/profile/feedback");
  await page
    .getByPlaceholder("report a bug, share an idea...")
    .fill("E2E test feedback message");
  await page.getByRole("button", { name: /submit/i }).click();

  // Submit button transitions through "sending..." → "sent"
  await expect(page.getByRole("button", { name: /sent/i })).toBeVisible({
    timeout: 10_000,
  });
});

test("credits page shows balance and the three packages", async ({ page }) => {
  await signIn(page);
  await page.goto("/v2/credits");
  await expect(page.getByText(/current balance/i)).toBeVisible();
  await expect(page.getByText(/starter/i).first()).toBeVisible();
  await expect(page.getByText(/plus/i).first()).toBeVisible();
  await expect(page.getByText(/pro/i).first()).toBeVisible();
});
