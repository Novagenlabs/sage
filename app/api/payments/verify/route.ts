import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addCredits } from "@/lib/credits";
import { verifyTransaction } from "@/lib/paystack";
import { withAuth } from "@/lib/with-auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req, authUser) => {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.userId !== authUser.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Idempotent: already processed
  if (payment.status === "success") {
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { credits: true },
    });
    return NextResponse.json({
      status: "success",
      credits: user?.credits ?? 0,
      message: "Payment already verified",
    });
  }

  try {
    const txn = await verifyTransaction(reference);

    if (txn.status === "success") {
      await prisma.payment.update({
        where: { reference },
        data: { status: "success", metadata: txn as unknown as Prisma.InputJsonValue },
      });
      const newBalance = await addCredits(authUser.id, payment.credits);
      return NextResponse.json({
        status: "success",
        credits: newBalance,
        added: payment.credits,
      });
    } else {
      await prisma.payment.update({
        where: { reference },
        data: { status: "failed", metadata: txn as unknown as Prisma.InputJsonValue },
      });
      return NextResponse.json({ status: "failed", message: "Payment was not successful" });
    }
  } catch (error) {
    console.error("Paystack verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
});
