import { beforeEach, describe, expect, it } from "vitest";
import {
  makeReq,
  mockAuth,
  mockInngestSend,
  mockPrisma,
  resetMocks,
} from "./_mocks";

import { POST } from "@/app/api/conversation/end/route";

beforeEach(() => {
  resetMocks();
  mockAuth.mockResolvedValue({ user: { id: "u1" } });
  mockPrisma.conversation.findFirst.mockResolvedValue({ id: "c1" });
});

describe("POST /api/conversation/end", () => {
  it("rejects unauthenticated callers", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      makeReq("http://x/api/conversation/end", {
        body: { conversationId: "c1", type: "text" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("rejects missing conversationId", async () => {
    const res = await POST(
      makeReq("http://x/api/conversation/end", {
        body: { type: "text" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects unknown session type", async () => {
    const res = await POST(
      makeReq("http://x/api/conversation/end", {
        body: { conversationId: "c1", type: "fax" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("accepts text|voice|video", async () => {
    for (const type of ["text", "voice", "video"]) {
      const res = await POST(
        makeReq("http://x/api/conversation/end", {
          body: { conversationId: "c1", type },
        })
      );
      expect(res.status, `type=${type}`).toBe(200);
    }
  });

  it("404s when caller does not own the conversation", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    const res = await POST(
      makeReq("http://x/api/conversation/end", {
        body: { conversationId: "c1", type: "text" },
      })
    );
    expect(res.status).toBe(404);
  });

  it("filters and clamps the transcript before sending to inngest", async () => {
    const big = Array.from({ length: 600 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `m${i}`,
    }));
    // Inject some malformed entries that should be dropped
    big.push({ role: "system", content: "should be dropped" } as never);
    big.push({ role: "user", content: "" }); // blank — should be dropped

    const res = await POST(
      makeReq("http://x/api/conversation/end", {
        body: { conversationId: "c1", type: "text", transcript: big },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.queued).toBe(true);
    expect(data.turns).toBe(500); // capped at MAX_TURNS

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "conversation/ended",
        data: expect.objectContaining({
          conversationId: "c1",
          userId: "u1",
          type: "text",
          transcript: expect.any(Array),
        }),
      })
    );
    const sent = mockInngestSend.mock.calls[0][0].data.transcript;
    expect(sent.length).toBe(500);
    // Filter rule: no system roles, no blank content
    for (const t of sent) {
      expect(["user", "assistant"]).toContain(t.role);
      expect(t.content.length).toBeGreaterThan(0);
    }
  });
});
