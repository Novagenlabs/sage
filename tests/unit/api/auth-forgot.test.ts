import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeReq, mockPrisma, resetMocks } from "./_mocks";

// Stub the resend-using helper so we don't actually try to send mail.
// vi.hoisted lets us declare the stub before vi.mock's hoisted callsite.
const { sendStub } = vi.hoisted(() => ({
  sendStub: vi.fn(async () => ({ sent: true })),
}));
vi.mock("@/lib/password-reset", async (orig) => {
  const real = await orig<typeof import("@/lib/password-reset")>();
  return {
    ...real,
    sendResetEmail: sendStub,
  };
});

import { POST } from "@/app/api/auth/forgot/route";

beforeEach(() => {
  resetMocks();
  sendStub.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/forgot", () => {
  it("400s on invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/forgot", {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("400s on missing/invalid email", async () => {
    const res = await POST(
      makeReq("http://localhost/api/auth/forgot", {
        body: { email: "not-an-email" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with the same message even for unregistered emails (no enumeration)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await POST(
      makeReq("http://localhost/api/auth/forgot", {
        body: { email: "ghost@nowhere.test" },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(true);
    expect(body.message).toMatch(/registered/i);
    // No token created, no email sent — but the response shape is identical.
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendStub).not.toHaveBeenCalled();
  });

  it("mints a token, invalidates older outstanding tokens, and sends email when the user exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u_1",
      name: "Sam",
      email: "sam@example.com",
    });
    mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.passwordResetToken.create.mockResolvedValue({ id: "t_1" });

    const res = await POST(
      makeReq("http://localhost/api/auth/forgot", {
        body: { email: "sam@example.com" },
      })
    );
    expect(res.status).toBe(200);

    expect(mockPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u_1",
          usedAt: null,
        }),
        data: { usedAt: expect.any(Date) },
      })
    );
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    expect(sendStub).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "sam@example.com",
        userName: "Sam",
        resetUrl: expect.stringMatching(/\/auth\/reset-password\?token=/),
      })
    );
  });
});
