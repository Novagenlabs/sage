import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateReferralCode, getReferralStats } from "@/lib/referral";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const referralCode = await getOrCreateReferralCode(session.user.id);
    const stats = await getReferralStats(session.user.id);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const referralLink = `${baseUrl}/?ref=${referralCode}`;

    return NextResponse.json({
      referralCode,
      referralLink,
      ...stats,
    });
  } catch (error) {
    console.error("Referral stats error:", error);
    return NextResponse.json({ error: "Failed to get referral stats" }, { status: 500 });
  }
}
