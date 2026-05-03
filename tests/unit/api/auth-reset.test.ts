import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { makeReq, mockPrisma, resetMocks } from "./_mocks";

import { POST } from "@/app/api/auth/reset/route";

beforeEach(() => {
  resetMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

const VALID_TOKEN = "a".repeat(64); // 32 bytes hex

describe("POST /api/auth/reset", () => {
  it("400s on token shorter than 32 chars", async () => {
    const res = await POST(
      makeReq("http://localhost/api/auth/reset", {
        body: { token: "too-short", password: "secret123" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("400s on password shorter than 6 chars", async () => {
    const res = await POST(
      makeReq("http://localhost/api/auth/reset", {
        body: { token: VALID_TOKEN, password: "abc" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("400s when no candidate token matches (expired or used or wrong)", async () => {
    mockPrisma.passwordResetToken.findMany.mockResolvedValue([]);
    const res = await POST(
      makeReq("http://localhost/api/auth/reset", {
        body: { token: VALID_TOKEN, password: "newsecret" },
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/invalid or has expired/i);
  });

  it("updates password + marks token used + revokes siblings on a valid token", async () => {
    const tokenHash = await bcrypt.hash(VALID_TOKEN, 10);
    mockPrisma.passwordResetToken.findMany.mockResolvedValue([
      { id: "t_1", userId: "u_1", tokenHash },
    ]);
    mockPrisma.user.update.mockResolvedValue({ id: "u_1" });
    mockPrisma.passwordResetToken.update.mockResolvedValue({ id: "t_1" });
    mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

    const res = await POST(
      makeReq("http://localhost/api/auth/reset", {
        body: { token: VALID_TOKEN, password: "newsecret" },
      })
    );
    expect(res.status).toBe(200);

    // Verify the user got a fresh bcrypt hash (not the literal password).
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    const userUpdateCall = mockPrisma.user.update.mock.calls[0][0] as {
      where: { id: string };
      data: { password: string };
    };
    expect(userUpdateCall.where).toEqual({ id: "u_1" });
    expect(userUpdateCall.data.password).not.toBe("newsecret");
    expect(
      await bcrypt.compare("newsecret", userUpdateCall.data.password)
    ).toBe(true);

    // The matching token is marked used.
    expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t_1" },
        data: { usedAt: expect.any(Date) },
      })
    );

    // Any other still-valid sibling tokens for this user are revoked.
    expect(mockPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u_1",
          usedAt: null,
          id: { not: "t_1" },
        }),
        data: { usedAt: expect.any(Date) },
      })
    );
  });

  it("a token can only be used once — second submission fails", async () => {
    const tokenHash = await bcrypt.hash(VALID_TOKEN, 10);
    // First call: token is in the candidate set.
    mockPrisma.passwordResetToken.findMany.mockResolvedValueOnce([
      { id: "t_1", userId: "u_1", tokenHash },
    ]);
    // Second call: it's been marked used → DB filter excludes it.
    mockPrisma.passwordResetToken.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.update.mockResolvedValue({ id: "u_1" });
    mockPrisma.passwordResetToken.update.mockResolvedValue({ id: "t_1" });
    mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

    const first = await POST(
      makeReq("http://localhost/api/auth/reset", {
        body: { token: VALID_TOKEN, password: "newsecret" },
      })
    );
    expect(first.status).toBe(200);

    const second = await POST(
      makeReq("http://localhost/api/auth/reset", {
        body: { token: VALID_TOKEN, password: "newsecret2" },
      })
    );
    expect(second.status).toBe(400);
  });
});
