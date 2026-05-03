import { test, expect } from "@playwright/test";
import {
  ensureTestUser,
  signIn,
  stubChatStream,
  stubConversationApis,
  stubExplore,
  stubLivekit,
  stubAnam,
} from "./_helpers";

test.beforeAll(async ({ request }) => {
  await ensureTestUser(request);
});

test.beforeEach(async ({ page }) => {
  await stubConversationApis(page);
  await stubChatStream(page);
  await stubExplore(page);
  await stubLivekit(page);
  await stubAnam(page);
});

test("text chat: sending a message renders the streamed reply", async ({ page }) => {
  await signIn(page);
  await page.goto("/chat/text?fresh=1");

  // Wait for the text input to be ready (post-fresh-reset)
  const input = page.getByPlaceholder("tap to type...");
  await expect(input).toBeVisible({ timeout: 15_000 });

  await input.fill("hello sage");
  await page.keyboard.press("Enter");

  // Streamed assistant content appears
  await expect(page.getByText("Got it.").first()).toBeVisible({
    timeout: 15_000,
  });

  // User message is also visible
  await expect(page.getByText("hello sage").first()).toBeVisible();
});

test("text chat: explore card seeds a fresh conversation", async ({ page }) => {
  await signIn(page);
  await page.goto("/explore");

  // Click the first stubbed card
  await page.getByRole("heading", { name: /stub one/i }).click();

  // The seeded prompt should be sent automatically as the first user message
  await expect(
    page.getByText(/help me with something stubbed for tests/i)
  ).toBeVisible({ timeout: 15_000 });
  // And we should have routed to the chat with title in URL
  expect(page.url()).toMatch(/\/chat\/text/);
});

test("voice screen: shows voice picker + start button without connecting", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/chat/voice");

  // Tapping the "voice · ify" pill opens a bottom sheet — same picker UI as
  // /onboarding/voice, with audio previews. We just verify the sheet opens
  // and exposes the wheel + the "done" affordance, then close it.
  const pill = page.getByRole("button", { name: /voice/i }).first();
  await expect(pill).toBeVisible();
  await pill.click();
  const dialog = page.getByRole("dialog", { name: /choose a voice/i });
  await expect(dialog).toBeVisible();
  // Close via Escape — avoids racing the framer-motion enter animation that
  // briefly leaves the "done" button moving and makes Playwright's stability
  // check time out.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden({ timeout: 3_000 });

  // Start button visible + tappable now that the sheet is closed.
  await expect(
    page.getByRole("button", { name: /start session/i })
  ).toBeVisible();
  await page.getByRole("button", { name: /start session/i }).click();
  await expect(
    page.getByText(/stubbed for tests|couldn't connect|connection failed/i)
  ).toBeVisible({ timeout: 10_000 });
});

test("video screen: shows start button without mounting Anam SDK", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/chat/video");

  await expect(
    page.getByRole("button", { name: /start video session/i })
  ).toBeVisible();
  await page
    .getByRole("button", { name: /start video session/i })
    .click();
  // Stubbed 500 should land us back in idle with an error
  await expect(
    page.getByText(/stubbed for tests|couldn't reach|out of credits|couldn't start/i)
  ).toBeVisible({ timeout: 10_000 });
});
