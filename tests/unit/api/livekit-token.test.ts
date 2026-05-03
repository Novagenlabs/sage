import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeReq,
  mockAuth,
  mockHasEnoughCredits,
  mockPrisma,
  resetMocks,
} from "./_mocks";

// Stub the LiveKit SDK so we don't depend on its real signing/JWT machinery.
vi.mock("livekit-server-sdk", () => {
  class FakeAccessToken {
    constructor(_key: string, _secret: string, _opts: unknown) {}
    addGrant(_grant: unknown) {}
    async toJwt() {
      return "fake.jwt.token";
    }
  }
  return { AccessToken: FakeAccessToken };
});

import { POST } from "@/app/api/livekit/token/route";

beforeEach(() => {
  resetMocks();
  process.env.LIVEKIT_API_KEY = "lk_key";
  process.env.LIVEKIT_API_SECRET = "lk_secret";
  process.env.LIVEKIT_URL = "wss://livekit.test";
  mockAuth.mockResolvedValue({ user: { id: "u1" } });
  mockHasEnoughCredits.mockResolvedValue(true);
  mockPrisma.user.findUnique.mockResolvedValue({
    name: "Sam",
    profileSummary: null,
  });
  mockPrisma.conversation.findMany.mockResolvedValue([]);
  mockPrisma.conversation.updateMany.mockResolvedValue({});
  mockPrisma.conversation.create.mockResolvedValue({ id: "conv_new" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const validBody = {
  roomName: "sage-test-room",
  participantName: "user-abc",
  voiceKey: "ify",
};

describe("POST /api/livekit/token", () => {
  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      makeReq("http://localhost/api/livekit/token", { body: validBody })
    );
    expect(res.status).toBe(401);
  });

  it("rejects when out of credits", async () => {
    mockHasEnoughCredits.mockResolvedValue(false);
    const res = await POST(
      makeReq("http://localhost/api/livekit/token", { body: validBody })
    );
    expect(res.status).toBe(402);
  });

  it("400s without roomName / participantName", async () => {
    const res = await POST(
      makeReq("http://localhost/api/livekit/token", {
        body: { voiceKey: "ify" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates a Conversation row + returns token, url, conversationId", async () => {
    const res = await POST(
      makeReq("http://localhost/api/livekit/token", { body: validBody })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBe("fake.jwt.token");
    expect(data.url).toBe("wss://livekit.test");
    expect(data.conversationId).toBe("conv_new");
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          isActive: true,
        }),
      })
    );
    // Old active conversations get deactivated first.
    expect(mockPrisma.conversation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", isActive: true },
        data: { isActive: false },
      })
    );
  });

  describe("ghost mode", () => {
    it("when ghost: true, skips Conversation creation and returns conversationId: null", async () => {
      const res = await POST(
        makeReq("http://localhost/api/livekit/token", {
          body: { ...validBody, ghost: true },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.token).toBe("fake.jwt.token");
      expect(data.conversationId).toBeNull();
      // Nothing about a ghost call should touch the DB write paths.
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
      expect(mockPrisma.conversation.updateMany).not.toHaveBeenCalled();
    });

    it("when ghost: false, persists a Conversation row as usual", async () => {
      const res = await POST(
        makeReq("http://localhost/api/livekit/token", {
          body: { ...validBody, ghost: false },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.conversationId).toBe("conv_new");
      expect(mockPrisma.conversation.create).toHaveBeenCalledOnce();
    });
  });
});
