// POST /api/revenuecat/webhook — grants AI credits server-side when a
// consumable credit pack is purchased via Apple IAP (through RevenueCat).
//
// This is the mobile equivalent of the Paystack webhook: purchases flow
// Apple IAP → RevenueCat → this webhook → addCredits(). The client NEVER
// grants credits (App Store + security requirement).
//
// RevenueCat auth: set an "Authorization header value" in the RevenueCat
// dashboard (Project → Integrations → Webhooks) and store it as
// REVENUECAT_WEBHOOK_SECRET; we compare it constant-time.
//
// Idempotency: each grant is recorded as a Payment row keyed by the RC
// transaction id (unique `reference`), so retries can't double-credit.

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { addCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map each CONSUMABLE credit-pack product id → credits granted.
// IMPORTANT: these product ids must match the consumables you create in
// App Store Connect + RevenueCat. Update the amounts to your real packs.
const CREDIT_PRODUCTS: Record<string, number> = {
  credits_500: 500,
  credits_1500: 1500,
  credits_5000: 5000,
};

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  // 1) Verify the shared secret RevenueCat sends in the Authorization header.
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[RC-WEBHOOK] REVENUECAT_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, secret)) {
    console.warn("[RC-WEBHOOK] Invalid authorization header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // From here, always return 200 so RevenueCat doesn't retry-storm us.
  try {
    const body = (await req.json()) as {
      event?: {
        type?: string;
        id?: string;
        app_user_id?: string;
        product_id?: string;
        transaction_id?: string;
        store?: string;
      };
    };
    const event = body.event;
    if (!event) return NextResponse.json({ message: "no event" });

    console.log(`[RC-WEBHOOK] type=${event.type} product=${event.product_id} user=${event.app_user_id}`);

    // Only consumable credit packs grant credits here. Subscription/lifetime
    // "Sage Pro" access is gated by the entitlement on the client, not credits.
    // RevenueCat sends NON_RENEWING_PURCHASE for consumables.
    if (event.type !== "NON_RENEWING_PURCHASE") {
      return NextResponse.json({ message: "ignored event type" });
    }

    const userId = event.app_user_id;
    const productId = event.product_id ?? "";
    const grant = CREDIT_PRODUCTS[productId];
    const txnId = event.transaction_id || event.id || "";

    if (!userId || !grant || !txnId) {
      console.warn(`[RC-WEBHOOK] missing data — user=${userId} product=${productId} txn=${txnId}`);
      return NextResponse.json({ message: "nothing to grant" });
    }

    // Confirm the user exists (app_user_id could be an anonymous RC id if the
    // app didn't logIn — we only grant to real accounts).
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      console.warn(`[RC-WEBHOOK] no user for app_user_id=${userId}`);
      return NextResponse.json({ message: "no matching user" });
    }

    // Idempotent grant: the unique `reference` (txnId) blocks double-credit on
    // retries. If the row already exists, we've handled it.
    const reference = `rc_${txnId}`;
    const existing = await prisma.payment.findUnique({ where: { reference } });
    if (existing) {
      return NextResponse.json({ message: "already processed" });
    }

    await prisma.payment.create({
      data: {
        userId,
        reference,
        amount: 0, // Apple holds the money; we don't track kobo here.
        credits: grant,
        status: "success",
        provider: "revenuecat",
        metadata: { productId, store: event.store ?? "APP_STORE", type: event.type },
      },
    });
    const newBalance = await addCredits(userId, grant);
    console.log(`[RC-WEBHOOK] +${grant} credits to ${userId} (${productId}) → ${newBalance}`);

    return NextResponse.json({ granted: grant, balance: newBalance });
  } catch (error) {
    console.error("[RC-WEBHOOK] error", error);
    // Still 200 — log + investigate rather than trigger retries.
    return NextResponse.json({ message: "error logged" });
  }
}
