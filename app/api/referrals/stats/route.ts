import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getOrCreateReferralCode, getReferralStats } from "@/lib/referral";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const referralCode = await getOrCreateReferralCode(session.user.id);
    const stats = await getReferralStats(session.user.id);

    // Derive base URL from the incoming request so it works in any environment
    const origin = request.headers.get("x-forwarded-host")
      ? `https://${request.headers.get("x-forwarded-host")}`
      : request.headers.get("host")
      ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`
      : process.env.NEXT_PUBLIC_SITE_URL || "https://answerswithsage.xyz";
    const referralLink = `${origin}/?ref=${referralCode}`;

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
