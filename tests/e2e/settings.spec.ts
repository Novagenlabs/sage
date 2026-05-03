import { test, expect } from "@playwright/test";
import {
  ensureTestUser,
  signIn,
  stubAnam,
  stubConversationApis,
  stubLivekit,
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
  await page.goto("/ghost");

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
  await page.goto("/profile");
  const ghostRow = page.getByRole("link", { name: /ghost mode/i });
  await expect(ghostRow).toBeVisible();
  // Right label "on" is rendered inside the same anchor.
  await expect(ghostRow).toContainText(/on/i);
});

test("ghost mode: voice + video idle screens reflect the toggle state", async ({
  page,
}) => {
  await stubLivekit(page);
  await stubAnam(page);
  await signIn(page);

  // Default: ghost off — both idle screens should say "ghost · off".
  await page.goto("/chat/voice");
  await expect(
    page.getByRole("link", { name: /ghost\s*·\s*off/i })
  ).toBeVisible({ timeout: 15_000 });

  await page.goto("/chat/video");
  await expect(
    page.getByRole("link", { name: /ghost\s*·\s*off/i })
  ).toBeVisible({ timeout: 15_000 });

  // Flip ghost on via localStorage (the toggle UI is covered by the test
  // above; this isolates the visual reflection on the chat screens).
  await page.evaluate(() => {
    window.localStorage.setItem("sage-ghost-mode", "1");
  });

  await page.goto("/chat/voice");
  await expect(
    page.getByRole("link", { name: /ghost\s*·\s*on/i })
  ).toBeVisible({ timeout: 15_000 });
  // The start-screen copy switches to the privacy reassurance.
  await expect(
    page.getByText(/nothing from this session is saved/i)
  ).toBeVisible();

  await page.goto("/chat/video");
  await expect(
    page.getByRole("link", { name: /ghost\s*·\s*on/i })
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText(/nothing from this session is saved/i)
  ).toBeVisible();
});

test("ghost mode: voice page POSTs ghost: true to /api/livekit/token", async ({
  page,
}) => {
  // Capture the request body the voice page sends when ghost is on.
  let lastTokenBody: { ghost?: boolean; voiceKey?: string } | null = null;
  await page.route("**/api/livekit/token", async (route) => {
    const body = route.request().postData();
    lastTokenBody = body ? (JSON.parse(body) as { ghost?: boolean }) : null;
    // Return a 500 so the page surfaces an error and we stay on the
    // start screen — we only care about the request, not the connection.
    await route.fulfill({
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "stubbed" }),
    });
  });

  await signIn(page);
  await page.evaluate(() => {
    window.localStorage.setItem("sage-ghost-mode", "1");
  });
  await page.goto("/chat/voice");
  await page.getByRole("button", { name: /start session/i }).click();

  await expect.poll(() => lastTokenBody?.ghost).toBe(true);
});

test("ghost mode: video page POSTs ghost: true to /api/anam/session", async ({
  page,
}) => {
  let lastAnamBody: { ghost?: boolean } | null = null;
  await page.route("**/api/anam/session", async (route) => {
    const body = route.request().postData();
    lastAnamBody = body ? (JSON.parse(body) as { ghost?: boolean }) : null;
    await route.fulfill({
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "stubbed" }),
    });
  });

  await signIn(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("sage-ghost-mode", "1");
    // Acknowledge the video beta warning so it doesn't intercept the click.
    window.localStorage.setItem("sage-video-beta-ack", "1");
  });
  await page.goto("/chat/video");
  await page.getByRole("button", { name: /start video session/i }).click();

  await expect.poll(() => lastAnamBody?.ghost).toBe(true);
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
  await page.goto("/profile/feedback");
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
  await page.goto("/credits");
  await expect(page.getByText(/current balance/i)).toBeVisible();
  await expect(page.getByText(/starter/i).first()).toBeVisible();
  await expect(page.getByText(/plus/i).first()).toBeVisible();
  await expect(page.getByText(/pro/i).first()).toBeVisible();
});
