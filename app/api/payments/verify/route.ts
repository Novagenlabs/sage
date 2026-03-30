import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addCredits } from "@/lib/credits";
import { verifyTransaction } from "@/lib/paystack";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Idempotent: already processed
  if (payment.status === "success") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });
    return NextResponse.json({
      status: "success",
      credits: user?.credits ?? 0,
      message: "Payment already verified",
    });
  }

  try {
    console.log(`[VERIFY] Verifying payment: ${reference} for user ${session.user.id}`);
    const txn = await verifyTransaction(reference);
    console.log(`[VERIFY] Paystack status: ${txn.status}, amount: ${txn.amount}`);

    if (txn.status === "success") {
      // Verify amount matches expected (security check)
      if (txn.amount !== payment.amount) {
        console.error(`[VERIFY] Amount mismatch for ${reference}: expected ${payment.amount}, got ${txn.amount}`);
        return NextResponse.json({ status: "failed", message: "Amount mismatch" });
      }

      await prisma.payment.update({
        where: { reference },
        data: { status: "success", metadata: txn as unknown as Prisma.InputJsonValue },
      });
      const newBalance = await addCredits(session.user.id, payment.credits);
      console.log(`[VERIFY] Credited ${payment.credits} credits. New balance: ${newBalance}`);
      return NextResponse.json({
        status: "success",
        credits: newBalance,
        added: payment.credits,
      });
    } else {
      console.log(`[VERIFY] Payment not successful: ${txn.status}`);
      await prisma.payment.update({
        where: { reference },
        data: { status: "failed", metadata: txn as unknown as Prisma.InputJsonValue },
      });
      return NextResponse.json({ status: "failed", message: "Payment was not successful" });
    }
  } catch (error) {
    console.error("[VERIFY] Paystack verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
