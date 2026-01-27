import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { addCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY!;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const { reference } = event.data;

    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 200 });
    }

    // Idempotent: skip if already processed
    if (payment.status === "success") {
      return NextResponse.json({ message: "Already processed" });
    }

    await prisma.payment.update({
      where: { reference },
      data: { status: "success", metadata: event.data },
    });

    await addCredits(payment.userId, payment.credits);
  }

  return NextResponse.json({ message: "Webhook received" });
}
