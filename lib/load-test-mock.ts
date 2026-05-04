// Load-test mock mode. Flip LOAD_TEST_MOCK=1 in the environment and the
// app short-circuits all paid external calls (OpenRouter, ElevenLabs,
// Anam, OpenAI embeddings) with deterministic local stand-ins. Lets us
// run k6 / artillery against a local or staging instance at thousands of
// concurrent users without burning real API budget or hitting rate limits.
//
// Production must NEVER set this flag. Sanity guard: if NODE_ENV is
// "production" we ignore the env var entirely and always return false.
//
// Wire-up rule: anywhere we call an external billed API, gate it on
// `isMockMode()` and return the matching mock response from this file.
// Keep mocks here so the whole stub surface lives in one place.

export function isMockMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.LOAD_TEST_MOCK === "1";
}

/** Canned SSE chunks that look like an OpenRouter chat completion stream.
 *  Used to stand in for the /api/chat route's upstream call. */
export function mockChatSSE(content?: string): string {
  const reply =
    content ??
    "I notice you've been turning this over for a while. What part of it feels stuck?";
  // Split into a few chunks so the client's parser actually exercises its
  // loop. Each chunk is a valid OpenRouter delta event.
  const chunks = reply.match(/.{1,40}/g) ?? [reply];
  const id = `mock_${Date.now()}`;
  const lines = chunks.map((c) =>
    `data: ${JSON.stringify({
      id,
      choices: [{ delta: { content: c } }],
    })}\n\n`
  );
  return lines.join("") + "data: [DONE]\n\n";
}

/** Build a Response that streams the mock SSE. Mirrors the shape of the
 *  real /api/chat output so client parsers don't notice. */
export function mockChatResponse(content?: string): Response {
  const sse = mockChatSSE(content);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sse));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Mock-Mode": "1",
    },
  });
}

/** Deterministic match result. Picks the first catalog id we're handed
 *  so the matcher path runs end-to-end without an LLM call. */
export function mockMatchResult(catalogIds: string[]): {
  resourceId: string;
  reason: string;
} | null {
  if (catalogIds.length === 0) return null;
  return {
    resourceId: catalogIds[0],
    reason: "load-test mock — first catalog id, no LLM was called.",
  };
}

/** A single 1536-dim vector of zeros, for short-circuiting embeddings. */
export function mockEmbedding(): number[] {
  return new Array(1536).fill(0);
}
