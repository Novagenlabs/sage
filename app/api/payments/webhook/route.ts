import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { addCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!signature) {
    console.warn("[WEBHOOK] No signature header");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("[WEBHOOK] PAYSTACK_SECRET_KEY not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const hash = crypto
    .createHmac("sha512", secret)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    console.warn("[WEBHOOK] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Signature valid — always return 200 from here to prevent Paystack retries
  try {
    const event = JSON.parse(body);
    console.log(`[WEBHOOK] Event: ${event.event}, reference: ${event.data?.reference}`);

    if (event.event === "charge.success") {
      const { reference, amount } = event.data;

      const payment = await prisma.payment.findUnique({ where: { reference } });
      if (!payment) {
        console.warn(`[WEBHOOK] Payment not found for reference: ${reference}`);
        return NextResponse.json({ message: "Payment not found" });
      }

      // Idempotent: skip if already processed
      if (payment.status === "success") {
        console.log(`[WEBHOOK] Already processed: ${reference}`);
        return NextResponse.json({ message: "Already processed" });
      }

      // Verify amount matches expected (security check)
      if (amount !== payment.amount) {
        console.error(`[WEBHOOK] Amount mismatch for ${reference}: expected ${payment.amount}, got ${amount}`);
        return NextResponse.json({ message: "Amount mismatch" });
      }

      await prisma.payment.update({
        where: { reference },
        data: { status: "success", metadata: event.data },
      });

      const newBalance = await addCredits(payment.userId, payment.credits);
      console.log(`[WEBHOOK] Credited ${payment.credits} credits to user ${payment.userId}. New balance: ${newBalance}`);
    }
  } catch (error) {
    // Log but still return 200 — we don't want Paystack retrying a malformed event
    console.error("[WEBHOOK] Processing error:", error);
  }

  return NextResponse.json({ message: "Webhook received" });
}
