import { beforeEach, describe, expect, it } from "vitest";
import { makeReq, mockPrisma, mockAddCredits, resetMocks } from "./_mocks";

import { POST } from "@/app/api/revenuecat/webhook/route";

const SECRET = "test-rc-secret";

// Build a RevenueCat webhook request with the shared-secret auth header.
function rcReq(event: Record<string, unknown>, auth = SECRET) {
  return makeReq("http://x/api/revenuecat/webhook", {
    body: { event },
    headers: { authorization: auth },
  });
}

beforeEach(() => {
  resetMocks();
  process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
  // Default: a real user exists, and no prior payment for this txn.
  mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
  mockPrisma.payment.findUnique.mockResolvedValue(null);
  mockPrisma.payment.create.mockResolvedValue({});
  mockAddCredits.mockResolvedValue(1000);
});

describe("POST /api/revenuecat/webhook", () => {
  it("rejects a wrong/missing authorization secret", async () => {
    const res = await POST(rcReq({ type: "NON_RENEWING_PURCHASE" }, "nope"));
    expect(res.status).toBe(401);
    expect(mockAddCredits).not.toHaveBeenCalled();
  });

  it("500s when the webhook secret is not configured", async () => {
    delete process.env.REVENUECAT_WEBHOOK_SECRET;
    const res = await POST(rcReq({ type: "NON_RENEWING_PURCHASE" }));
    expect(res.status).toBe(500);
  });

  it("grants the mapped credits for each consumable pack", async () => {
    const cases: Array<[string, number]> = [
      ["credits_starter", 200],
      ["credits_plus", 1000],
      ["credits_pro", 3000],
    ];
    for (const [productId, credits] of cases) {
      resetMocks();
      process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({});
      mockAddCredits.mockResolvedValue(credits);

      await POST(
        rcReq({
          type: "NON_RENEWING_PURCHASE",
          app_user_id: "u1",
          product_id: productId,
          transaction_id: `txn_${productId}`,
        })
      );
      expect(mockAddCredits).toHaveBeenCalledWith("u1", credits);
    }
  });

  it("grants the per-period allowance on subscription INITIAL_PURCHASE and RENEWAL", async () => {
    for (const type of ["INITIAL_PURCHASE", "RENEWAL"]) {
      for (const [productId, credits] of [
        ["sage_pro_monthly_v2", 1000],
        ["sage_pro_yearly_v2", 12000],
      ] as Array<[string, number]>) {
        resetMocks();
        process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
        mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
        mockPrisma.payment.findUnique.mockResolvedValue(null);
        mockPrisma.payment.create.mockResolvedValue({});
        mockAddCredits.mockResolvedValue(credits);

        await POST(
          rcReq({
            type,
            app_user_id: "u1",
            product_id: productId,
            transaction_id: `txn_${type}_${productId}`,
          })
        );
        expect(mockAddCredits).toHaveBeenCalledWith("u1", credits);
      }
    }
  });

  it("does not grant for an unknown / retired product id", async () => {
    // The old IDs (credits_500 etc.) must no longer grant anything.
    const res = await POST(
      rcReq({
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "u1",
        product_id: "credits_500",
        transaction_id: "txn_old",
      })
    );
    expect(res.status).toBe(200);
    expect(mockAddCredits).not.toHaveBeenCalled();
  });

  it("ignores unrelated event types (e.g. CANCELLATION)", async () => {
    await POST(
      rcReq({
        type: "CANCELLATION",
        app_user_id: "u1",
        product_id: "sage_pro_monthly_v2",
        transaction_id: "txn_cancel",
      })
    );
    expect(mockAddCredits).not.toHaveBeenCalled();
  });

  it("is idempotent — a duplicate transaction does not double-credit", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({ id: "p1" }); // already processed
    const res = await POST(
      rcReq({
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "u1",
        product_id: "credits_plus",
        transaction_id: "txn_dup",
      })
    );
    expect(res.status).toBe(200);
    expect(mockAddCredits).not.toHaveBeenCalled();
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it("does not grant when the app_user_id has no matching account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await POST(
      rcReq({
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "anonymous-rc-id",
        product_id: "credits_pro",
        transaction_id: "txn_anon",
      })
    );
    expect(mockAddCredits).not.toHaveBeenCalled();
  });

  it("records the grant as an idempotent payment row before crediting", async () => {
    await POST(
      rcReq({
        type: "RENEWAL",
        app_user_id: "u1",
        product_id: "sage_pro_yearly_v2",
        transaction_id: "txn_renew_1",
      })
    );
    expect(mockPrisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          reference: "rc_txn_renew_1",
          credits: 12000,
          provider: "revenuecat",
        }),
      })
    );
  });
});
