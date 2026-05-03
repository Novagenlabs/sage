import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeReq, mockAuth, mockPrisma, resetMocks } from "./_mocks";

// We don't run the matcher in these tests — only checking the
// pre-matcher guards (auth, ownership, mid-session one-per-session).
import { POST } from "@/app/api/recommendations/stream/route";

beforeEach(() => {
  resetMocks();
  mockAuth.mockResolvedValue({ user: { id: "u_1" } });
});

afterEach(() => {
  vi.clearAllMocks();
});

async function readSseEvents(stream: ReadableStream<Uint8Array> | null) {
  if (!stream) return [];
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const events: string[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    decoder.decode(value, { stream: true })
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .forEach((l) => events.push(l.slice(5).trim()));
  }
  return events;
}

describe("POST /api/recommendations/stream — guards", () => {
  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      makeReq("http://localhost/api/recommendations/stream", {
        body: { conversationId: "c_1" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("400s without conversationId", async () => {
    const res = await POST(
      makeReq("http://localhost/api/recommendations/stream", {
        body: {},
      })
    );
    expect(res.status).toBe(400);
  });

  it("404s when the conversation isn't owned by the user", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    const res = await POST(
      makeReq("http://localhost/api/recommendations/stream", {
        body: { conversationId: "c_other" },
      })
    );
    expect(res.status).toBe(404);
  });

  it("midSession + existing recommendation → emits done immediately and skips matching", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: "c_1",
      summary: null,
    });
    (
      mockPrisma.recommendation as unknown as {
        findFirst: ReturnType<typeof vi.fn>;
      }
    ).findFirst = vi.fn().mockResolvedValue({ id: "rec_existing" });

    const res = await POST(
      makeReq("http://localhost/api/recommendations/stream", {
        body: {
          conversationId: "c_1",
          midSession: true,
          patternHint: "decision paralysis",
        },
      })
    );
    expect(res.status).toBe(200);
    const events = await readSseEvents(res.body);
    // Only the done event — never reached the matcher.
    expect(events).toEqual([JSON.stringify({ type: "done" })]);
  });
});
