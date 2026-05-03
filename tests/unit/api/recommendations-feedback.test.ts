import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeReq,
  mockAuth,
  mockPrisma,
  resetMocks,
} from "./_mocks";

import { POST } from "@/app/api/recommendations/[id]/feedback/route";

beforeEach(() => {
  resetMocks();
  mockAuth.mockResolvedValue({ user: { id: "u1" } });
});

afterEach(() => {
  vi.clearAllMocks();
});

const ctxFor = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/recommendations/[id]/feedback", () => {
  it("rejects unauthenticated requests with 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      makeReq("http://localhost/api/recommendations/rec_1/feedback", {
        body: { feedback: "helpful" },
      }),
      ctxFor("rec_1")
    );
    expect(res.status).toBe(401);
  });

  it("rejects bad feedback values with 400", async () => {
    const res = await POST(
      makeReq("http://localhost/api/recommendations/rec_1/feedback", {
        body: { feedback: "lol" },
      }),
      ctxFor("rec_1")
    );
    expect(res.status).toBe(400);
  });

  it("rejects when the recommendation doesn't belong to the user with 404", async () => {
    // Recommendation exists but is owned by someone else — findFirst returns null.
    (mockPrisma.recommendation as unknown as {
      findFirst: ReturnType<typeof vi.fn>;
    }).findFirst = vi.fn().mockResolvedValue(null);
    const res = await POST(
      makeReq("http://localhost/api/recommendations/rec_1/feedback", {
        body: { feedback: "helpful" },
      }),
      ctxFor("rec_1")
    );
    expect(res.status).toBe(404);
  });

  it("writes feedback for the user's own recommendation", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "rec_1" });
    const update = vi.fn().mockResolvedValue({
      id: "rec_1",
      feedback: "helpful",
      feedbackAt: new Date("2026-05-03T00:00:00Z"),
    });
    (mockPrisma.recommendation as unknown as {
      findFirst: typeof findFirst;
      update: typeof update;
    }).findFirst = findFirst;
    (mockPrisma.recommendation as unknown as {
      findFirst: typeof findFirst;
      update: typeof update;
    }).update = update;

    const res = await POST(
      makeReq("http://localhost/api/recommendations/rec_1/feedback", {
        body: { feedback: "helpful" },
      }),
      ctxFor("rec_1")
    );
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rec_1" },
        data: expect.objectContaining({ feedback: "helpful" }),
      })
    );
  });

  it("is idempotent — flipping helpful → not_for_me succeeds", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "rec_1" });
    const update = vi
      .fn()
      .mockResolvedValueOnce({
        id: "rec_1",
        feedback: "helpful",
        feedbackAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: "rec_1",
        feedback: "not_for_me",
        feedbackAt: new Date(),
      });
    (mockPrisma.recommendation as unknown as {
      findFirst: typeof findFirst;
      update: typeof update;
    }).findFirst = findFirst;
    (mockPrisma.recommendation as unknown as {
      findFirst: typeof findFirst;
      update: typeof update;
    }).update = update;

    const first = await POST(
      makeReq("http://localhost/api/recommendations/rec_1/feedback", {
        body: { feedback: "helpful" },
      }),
      ctxFor("rec_1")
    );
    expect(first.status).toBe(200);

    const second = await POST(
      makeReq("http://localhost/api/recommendations/rec_1/feedback", {
        body: { feedback: "not_for_me" },
      }),
      ctxFor("rec_1")
    );
    expect(second.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(2);
  });
});
