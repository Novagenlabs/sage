import { test, expect } from "@playwright/test";
import {
  ensureTestUser,
  signIn,
  stubChatStream,
  stubConversationApis,
} from "./_helpers";

test.beforeAll(async ({ request }) => {
  await ensureTestUser(request);
});

test.beforeEach(async ({ page }) => {
  await stubConversationApis(page);
  await stubChatStream(page);
});

test("text chat: finish & reflect renders the recommendation card and records feedback", async ({
  page,
}) => {
  // Stub the SSE matcher to deterministically produce a known recommendation.
  // We hand-craft the SSE body since route.fulfill emits it whole.
  const sse =
    `data: ${JSON.stringify({ type: "thinking" })}\n\n` +
    `data: ${JSON.stringify({
      type: "data_card",
      data: {
        kind: "resource_recommendation",
        recommendation: {
          recommendationId: "rec_e2e",
          resource: {
            id: "res_e2e",
            type: "video",
            title: "Plato's Allegory of the Cave",
            author: "TED-Ed",
            url: "https://example.com/cave",
            blurb: "A short retelling of the parable.",
          },
          reason:
            "you kept circling around how isolating it feels when others can't see what you see — this might name that experience.",
          feedback: null,
        },
      },
    })}\n\n` +
    `data: ${JSON.stringify({ type: "done" })}\n\n`;

  await page.route("**/api/recommendations/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: sse,
    });
  });

  let feedbackBody: { feedback?: string } | null = null;
  await page.route("**/api/recommendations/rec_e2e/feedback", async (route) => {
    const raw = route.request().postData();
    feedbackBody = raw ? (JSON.parse(raw) as { feedback?: string }) : null;
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, id: "rec_e2e", feedback: "helpful" }),
    });
  });

  await signIn(page);
  await page.goto("/chat/text?fresh=1");

  const input = page.getByPlaceholder("tap to type...");
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill("hello sage");
  await page.keyboard.press("Enter");
  // Wait for the streamed reply so a Conversation row exists in state.
  await expect(page.getByText("Got it.").first()).toBeVisible({
    timeout: 15_000,
  });

  // Tap the X (which becomes "finish & reflect" once messages > 0).
  await page.getByRole("button", { name: /finish and reflect/i }).click();

  // Card streams in from the stubbed SSE.
  await expect(
    page.getByText(/plato's allegory of the cave/i)
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/circling around how isolating/i)).toBeVisible();

  // Click helpful → fires the feedback request → card replaced with thanks.
  await page.getByRole("button", { name: /^helpful$/i }).click();
  await expect(page.getByText(/thanks for the signal/i)).toBeVisible({
    timeout: 5_000,
  });
  expect(feedbackBody?.feedback).toBe("helpful");
});

test("recommendation card: 'play in app' opens the in-app player sheet with a YouTube embed", async ({
  page,
}) => {
  // Same SSE stub as above but with a YouTube URL so we can verify the
  // ResourcePlayer renders an iframe rather than just the external link.
  const sse =
    `data: ${JSON.stringify({ type: "thinking" })}\n\n` +
    `data: ${JSON.stringify({
      type: "data_card",
      data: {
        kind: "resource_recommendation",
        recommendation: {
          recommendationId: "rec_yt",
          resource: {
            id: "res_yt",
            type: "video",
            title: "Plato's Allegory of the Cave",
            author: "TED-Ed",
            url: "https://www.youtube.com/watch?v=1RWOpQXTltA",
            blurb: "A short retelling of the parable.",
            audioUrl: null,
          },
          reason: "you keep circling around isolation.",
          feedback: null,
        },
      },
    })}\n\n` +
    `data: ${JSON.stringify({ type: "done" })}\n\n`;

  await page.route("**/api/recommendations/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: sse,
    });
  });

  await signIn(page);
  await page.goto("/chat/text?fresh=1");
  const input = page.getByPlaceholder("tap to type...");
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill("hello");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Got it.").first()).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: /finish and reflect/i }).click();
  await expect(
    page.getByText(/plato's allegory of the cave/i)
  ).toBeVisible({ timeout: 10_000 });

  // Tap the play-in-app button → sheet opens with a YouTube iframe inside.
  await page.getByRole("button", { name: /play in app/i }).click();
  const dialog = page.getByRole("dialog", {
    name: /plato's allegory of the cave/i,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.locator("iframe[src*='youtube.com/embed/1RWOpQXTltA']")
  ).toBeAttached();

  // Close on Escape — avoids racing the framer-motion enter animation.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden({ timeout: 3_000 });
});

test("text chat: mid-session recommend marker surfaces a card above the input", async ({
  page,
}) => {
  // Stub the chat stream so the assistant message ends with a RECOMMEND
  // marker. The card should slide in above the input.
  await page.route("**/api/chat", async (route) => {
    const sse =
      `data: ${JSON.stringify({
        choices: [{ delta: { content: "I notice you've been spinning on this. " } }],
      })}\n\n` +
      `data: ${JSON.stringify({
        choices: [
          {
            delta: {
              content:
                "<!--PHASE:{\"phase\":\"examining\",\"next\":null,\"ready\":false}-->\n<!--RECOMMEND:decision paralysis-->",
            },
          },
        ],
      })}\n\n` +
      `data: [DONE]\n\n`;
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: sse,
    });
  });

  // Stub the recommendation stream to return a deterministic card.
  await page.route("**/api/recommendations/stream", async (route) => {
    const body = route.request().postData() ?? "";
    expect(body).toContain('"midSession":true');
    expect(body).toContain("decision paralysis");
    const sse =
      `data: ${JSON.stringify({ type: "thinking" })}\n\n` +
      `data: ${JSON.stringify({
        type: "data_card",
        data: {
          kind: "resource_recommendation",
          recommendation: {
            recommendationId: "rec_mid",
            resource: {
              id: "res_mid",
              type: "video",
              title: "The Paradox of Choice",
              author: "Barry Schwartz",
              url: "https://example.com",
              blurb: "On too many options.",
              audioUrl: null,
              bodyText: null,
              bodyKind: null,
              bodySource: null,
            },
            reason: "decision paralysis kept surfacing here.",
            feedback: null,
          },
        },
      })}\n\n` +
      `data: ${JSON.stringify({ type: "done" })}\n\n`;
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: sse,
    });
  });

  await signIn(page);
  await page.goto("/chat/text?fresh=1");
  const input = page.getByPlaceholder("tap to type...");
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill("I keep going back and forth on this job offer");
  await page.keyboard.press("Enter");

  // Visible message should NOT contain the marker (it's stripped).
  const assistantMsg = page.getByText(/I notice you've been spinning/i).first();
  await expect(assistantMsg).toBeVisible({ timeout: 10_000 });
  await expect(assistantMsg).not.toContainText(/RECOMMEND/);
  await expect(assistantMsg).not.toContainText(/PHASE/);

  // Mid-session card slides in above the input.
  await expect(page.getByText(/sage notices/i)).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.getByText(/the paradox of choice/i)).toBeVisible();
  await expect(
    page.getByText(/decision paralysis kept surfacing here/i)
  ).toBeVisible();

  // "keep talking" dismisses without ending the session.
  await page.getByRole("button", { name: /keep talking/i }).click();
  await expect(page.getByText(/sage notices/i)).toBeHidden({
    timeout: 3_000,
  });
  // Input is still focused / usable.
  await expect(input).toBeVisible();
});

test("text chat: when the matcher returns no card, navigates to /entries/active", async ({
  page,
}) => {
  // Matcher returns done with no data_card. A real Conversation row
  // exists (the stubConversationApis helper returns id "conv_test"
  // from POST /api/conversations), so the post-session ritual is to
  // land on /entries/active?id=… for the colour/mood paint step.
  const sseNoMatch =
    `data: ${JSON.stringify({ type: "thinking" })}\n\n` +
    `data: ${JSON.stringify({ type: "done" })}\n\n`;
  await page.route("**/api/recommendations/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: sseNoMatch,
    });
  });

  await signIn(page);
  await page.goto("/chat/text?fresh=1");

  const input = page.getByPlaceholder("tap to type...");
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill("hi");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Got it.").first()).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: /finish and reflect/i }).click();

  // Real session → paint surface.
  await page.waitForURL(/\/entries\/active(\?|$)/, { timeout: 15_000 });
});
