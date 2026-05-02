import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeReq,
  mockAuth,
  mockHasEnoughCredits,
  mockPrisma,
  resetMocks,
} from "./_mocks";

import { POST } from "@/app/api/anam/session/route";

beforeEach(() => {
  resetMocks();
  process.env.ANAM_API_KEY = "test-anam";
  mockAuth.mockResolvedValue({ user: { id: "u1" } });
  mockHasEnoughCredits.mockResolvedValue(true);
  mockPrisma.user.findUnique.mockResolvedValue({
    name: "Sam",
    profileSummary: null,
  });
  mockPrisma.conversation.findMany.mockResolvedValue([]);
  mockPrisma.conversation.updateMany.mockResolvedValue({});
  mockPrisma.conversation.create.mockResolvedValue({ id: "conv_new" });

  // Default: Anam returns a token
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ sessionToken: "anam_token_xyz" }), {
        status: 200,
      })
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/anam/session", () => {
  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("rejects when out of credits", async () => {
    mockHasEnoughCredits.mockResolvedValue(false);
    const res = await POST();
    expect(res.status).toBe(402);
  });

  it("500s when ANAM_API_KEY is unset", async () => {
    delete process.env.ANAM_API_KEY;
    const res = await POST();
    expect(res.status).toBe(500);
  });

  it("creates a Conversation row + returns sessionToken", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sessionToken).toBe("anam_token_xyz");
    expect(data.conversationId).toBe("conv_new");
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          isActive: true,
        }),
      })
    );
    // Old active conversations get deactivated first
    expect(mockPrisma.conversation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", isActive: true },
        data: { isActive: false },
      })
    );
  });

  it("502s when Anam returns a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rate limited", { status: 429 }))
    );
    const res = await POST();
    expect(res.status).toBe(502);
  });

  it("502s when Anam returns no token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }))
    );
    const res = await POST();
    expect(res.status).toBe(502);
  });
});
