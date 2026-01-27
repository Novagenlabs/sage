import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPackageById, initializeTransaction } from "@/lib/paystack";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { packageId } = await req.json();
  const pkg = getPackageById(packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  const reference = `pay_${crypto.randomUUID()}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  await prisma.payment.create({
    data: {
      userId: session.user.id,
      reference,
      amount: pkg.priceInKobo,
      credits: pkg.credits,
      status: "pending",
    },
  });

  try {
    const result = await initializeTransaction({
      email: session.user.email!,
      amount: pkg.priceInKobo,
      reference,
      callback_url: `${siteUrl}/credits?reference=${reference}`,
      metadata: {
        userId: session.user.id,
        packageId: pkg.id,
        credits: pkg.credits,
      },
    });

    return NextResponse.json({ authorization_url: result.authorization_url });
  } catch (error) {
    await prisma.payment.update({
      where: { reference },
      data: { status: "failed" },
    });
    console.error("Paystack init error:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
