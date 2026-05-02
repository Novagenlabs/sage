import { beforeEach, describe, expect, it } from "vitest";
import {
  makeReq,
  mockAuth,
  mockDeductCreditsWithOptions,
  resetMocks,
} from "./_mocks";

import { POST } from "@/app/api/credits/deduct/route";

beforeEach(() => {
  resetMocks();
  mockAuth.mockResolvedValue({ user: { id: "u1" } });
});

describe("POST /api/credits/deduct", () => {
  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      makeReq("http://x/api/credits/deduct", { body: { amount: 10 } })
    );
    expect(res.status).toBe(401);
  });

  it("rejects non-positive amount", async () => {
    const res = await POST(
      makeReq("http://x/api/credits/deduct", { body: { amount: 0 } })
    );
    expect(res.status).toBe(400);
  });

  it("returns 402 when deduction reports insufficient credits", async () => {
    mockDeductCreditsWithOptions.mockResolvedValue({
      success: false,
      remainingCredits: 1,
    });
    const res = await POST(
      makeReq("http://x/api/credits/deduct", {
        body: { amount: 100, type: "voice" },
      })
    );
    expect(res.status).toBe(402);
  });

  it("attributes voice to livekit and video to anam", async () => {
    mockDeductCreditsWithOptions.mockResolvedValue({
      success: true,
      remainingCredits: 50,
    });

    await POST(
      makeReq("http://x/api/credits/deduct", {
        body: { amount: 30, type: "voice", conversationId: "c1" },
      })
    );
    expect(mockDeductCreditsWithOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ service: "livekit", type: "voice" })
    );

    await POST(
      makeReq("http://x/api/credits/deduct", {
        body: { amount: 90, type: "video", conversationId: "c2" },
      })
    );
    expect(mockDeductCreditsWithOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ service: "anam", type: "video" })
    );
  });

  it("rounds the amount up", async () => {
    mockDeductCreditsWithOptions.mockResolvedValue({
      success: true,
      remainingCredits: 0,
    });
    await POST(
      makeReq("http://x/api/credits/deduct", {
        body: { amount: 1.4, type: "voice" },
      })
    );
    expect(mockDeductCreditsWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({ creditsUsed: 2 })
    );
  });
});
