import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeReq, mockAuth, mockPrisma, resetMocks } from "./_mocks";

import { POST } from "@/app/api/feedback/route";

beforeEach(() => {
  resetMocks();
  // Default: anonymous submission
  mockAuth.mockResolvedValue(null);
  mockPrisma.feedback.create.mockResolvedValue({
    id: "fb_1",
    createdAt: new Date(),
  });
  // Don't actually email — Resend env unset
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/feedback", () => {
  it("requires a message", async () => {
    const res = await POST(
      makeReq("http://x/api/feedback", { body: { message: "" } })
    );
    expect(res.status).toBe(400);
  });

  it("rejects too-long messages", async () => {
    const res = await POST(
      makeReq("http://x/api/feedback", {
        body: { message: "a".repeat(5001) },
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects malformed email", async () => {
    const res = await POST(
      makeReq("http://x/api/feedback", {
        body: { message: "hi", email: "not-an-email" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("stores anonymous feedback successfully", async () => {
    const res = await POST(
      makeReq("http://x/api/feedback", {
        body: { message: "love it", email: "alex@sage.test" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: null,
          email: "alex@sage.test",
          message: "love it",
          source: "v2",
        }),
      })
    );
  });

  it("attaches the user when signed in", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({
      name: "Sam",
      email: "sam@sage.test",
    });
    const res = await POST(
      makeReq("http://x/api/feedback", { body: { message: "thanks" } })
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", message: "thanks" }),
      })
    );
  });

  it("does not crash when Resend is unset (DB write still happens)", async () => {
    const res = await POST(
      makeReq("http://x/api/feedback", { body: { message: "hi" } })
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.feedback.create).toHaveBeenCalled();
  });
});
