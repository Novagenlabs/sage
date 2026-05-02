import { beforeEach, describe, expect, it } from "vitest";
import {
  makeReq,
  mockAddCredits,
  mockPrisma,
  resetMocks,
} from "./_mocks";

// Import AFTER the mocks are wired (vi.mock runs at the top of _mocks.ts).
import { POST } from "@/app/api/auth/register/route";

beforeEach(() => {
  resetMocks();
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockPrisma.user.create.mockResolvedValue({
    id: "u_test",
    email: "alex@sage.test",
    name: null,
    credits: 200,
  });
  mockPrisma.user.findFirst.mockResolvedValue(null);
  mockPrisma.referral.count.mockResolvedValue(0);
  mockPrisma.referral.create.mockResolvedValue({});
  mockPrisma.user.update.mockResolvedValue({});
  mockAddCredits.mockResolvedValue(320);
});

describe("POST /api/auth/register", () => {
  it("rejects missing email", async () => {
    const res = await POST(
      makeReq("http://x/api/auth/register", { body: { password: "secret123" } })
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing password", async () => {
    const res = await POST(
      makeReq("http://x/api/auth/register", {
        body: { email: "alex@sage.test" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects short password (< 6)", async () => {
    const res = await POST(
      makeReq("http://x/api/auth/register", {
        body: { email: "alex@sage.test", password: "short" },
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/6 characters/i);
  });

  it("rejects duplicate email", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(
      makeReq("http://x/api/auth/register", {
        body: { email: "alex@sage.test", password: "validpw" },
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/already registered/i);
  });

  it("creates the account and returns user shape on happy path", async () => {
    const res = await POST(
      makeReq("http://x/api/auth/register", {
        body: { email: "alex@sage.test", password: "validpw", name: "Alex" },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe("u_test");
    expect(data.user.email).toBe("alex@sage.test");
    expect(data.referralApplied).toBe(false);
  });

  it("applies a referral when the code is valid + within limits", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "referrer_id" });
    mockPrisma.referral.count.mockResolvedValue(0); // both daily + total are 0
    const res = await POST(
      makeReq("http://x/api/auth/register", {
        body: {
          email: "alex@sage.test",
          password: "validpw",
          referralCode: "sage_abc123",
        },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.referralApplied).toBe(true);
    expect(mockPrisma.referral.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referrerId: "referrer_id",
          referredUserId: "u_test",
        }),
      })
    );
    expect(mockAddCredits).toHaveBeenCalled();
  });

  it("does NOT apply a referral when daily cap is hit", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "referrer_id" });
    // daily count = 5 (cap), total = 0 — should still block
    mockPrisma.referral.count.mockResolvedValueOnce(5).mockResolvedValueOnce(0);
    const res = await POST(
      makeReq("http://x/api/auth/register", {
        body: {
          email: "alex@sage.test",
          password: "validpw",
          referralCode: "sage_abc123",
        },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.referralApplied).toBe(false);
    expect(mockPrisma.referral.create).not.toHaveBeenCalled();
  });

  it("does not fail signup if referral processing throws", async () => {
    mockPrisma.user.findFirst.mockRejectedValue(new Error("boom"));
    const res = await POST(
      makeReq("http://x/api/auth/register", {
        body: {
          email: "alex@sage.test",
          password: "validpw",
          referralCode: "sage_abc123",
        },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe("u_test");
    expect(data.referralApplied).toBe(false);
  });
});
