import { type Page, type APIRequestContext, expect } from "@playwright/test";

export const E2E_EMAIL = "e2e-user@sage.test";
export const E2E_PASSWORD = "e2e-test-password";
export const E2E_NAME = "E2E User";

/**
 * Make sure the canonical E2E user exists in the dev DB. Idempotent —
 * register returns a 400 "already registered" on subsequent runs which
 * we treat as success.
 */
export async function ensureTestUser(req: APIRequestContext) {
  const res = await req.post("/api/auth/register", {
    data: {
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      name: E2E_NAME,
    },
    failOnStatusCode: false,
  });
  // 200 = created, 400 = already registered. Anything else is a real failure.
  if (res.status() !== 200 && res.status() !== 400) {
    throw new Error(
      `Could not provision E2E test user: ${res.status()} ${await res.text()}`
    );
  }
}

/**
 * Sign in via the v2 form. Lands on /home on success.
 */
export async function signIn(page: Page) {
  await page.goto("/auth/signin");
  await page.getByPlaceholder("you@example.com").fill(E2E_EMAIL);
  await page.getByPlaceholder("••••••••").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/home/, { timeout: 15_000 });
}

/**
 * Stub the streaming chat endpoint so we don't hit OpenRouter from tests.
 * Returns a 1-token SSE stream that produces "Got it." as the assistant reply.
 */
export async function stubChatStream(page: Page) {
  await page.route("**/api/chat", async (route) => {
    const sse =
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Got it." } }] })}\n\n` +
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
}

/**
 * Stub the conversation lifecycle endpoints so we never write to the real DB
 * during tests beyond the registered test user.
 */
export async function stubConversationApis(page: Page) {
  await page.route("**/api/conversations", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "conv_test", title: "test" }),
      });
    } else {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([]),
      });
    }
  });
  await page.route("**/api/conversation/end", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queued: true, conversationId: "conv_test", turns: 0 }),
    });
  });
  await page.route("**/api/conversations/context", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recentSummaries: [],
        profileSummary: null,
        userName: E2E_NAME,
        activeConversation: null,
      }),
    });
  });
}

/** Stub LiveKit token so voice screen doesn't try to connect. */
export async function stubLivekit(page: Page) {
  await page.route("**/api/livekit/token", async (route) => {
    await route.fulfill({
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "stubbed for tests" }),
    });
  });
}

/** Stub Anam token so video screen doesn't actually mount the SDK. */
export async function stubAnam(page: Page) {
  await page.route("**/api/anam/session", async (route) => {
    await route.fulfill({
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "stubbed for tests" }),
    });
  });
}

/** Stub Paystack init so credits page doesn't redirect away. */
export async function stubPayments(page: Page) {
  await page.route("**/api/payments/initialize", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorization_url: null,
        error: "stubbed for tests",
      }),
    });
  });
}

/** Stub explore prompts to deterministic content. */
export async function stubExplore(page: Page) {
  await page.route("**/api/explore/prompts", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          section: "test",
          blurb: "stubbed test prompts.",
          items: [
            {
              title: "stub one",
              est: "5 min",
              prompt: "Help me with something stubbed for tests.",
              color: "bg-ember-500/15",
              accent: "from-ember-500/30",
            },
            {
              title: "stub two",
              est: "5 min",
              prompt: "Walk me through another stubbed exercise.",
              color: "bg-plum-400/15",
              accent: "from-plum-400/30",
            },
          ],
        },
      ]),
    });
  });
}

export async function expectOnPath(page: Page, pattern: RegExp | string) {
  await page.waitForURL(pattern as never, { timeout: 10_000 });
  if (typeof pattern === "string") {
    expect(page.url()).toContain(pattern);
  } else {
    expect(page.url()).toMatch(pattern);
  }
}
