import crypto from "crypto";
import { prisma } from "./prisma";
import { REFERRAL_CONFIG } from "./referral-config";

export function generateReferralCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(6);
  let code = REFERRAL_CONFIG.CODE_PREFIX;
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (user?.referralCode) {
    return user.referralCode;
  }

  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      return updated.referralCode!;
    } catch {
      continue;
    }
  }

  throw new Error("Failed to generate unique referral code");
}

export async function getReferralStats(userId: string) {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
  });

  const totalReferred = referrals.length;
  const qualifiedCount = referrals.filter((r) => r.status === "qualified").length;
  const totalCreditsEarned = referrals.reduce((sum, r) => sum + r.creditsPaid, 0);

  const recentReferrals = referrals.slice(0, 10).map((r) => ({
    id: r.id,
    status: r.status,
    creditsPaid: r.creditsPaid,
    createdAt: r.createdAt,
    qualifiedAt: r.qualifiedAt,
  }));

  return {
    totalReferred,
    qualifiedCount,
    totalCreditsEarned,
    recentReferrals,
  };
}

/**
 * Check if a referred user qualifies (3+ messages in at least 1 session).
 * This is a low bar to prevent abuse while still rewarding quickly.
 */
export async function checkQualification(userId: string): Promise<boolean> {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    select: {
      id: true,
      _count: {
        select: {
          messages: { where: { role: "user" } },
        },
      },
    },
  });

  const qualifyingSessions = conversations.filter(
    (c) => c._count.messages >= REFERRAL_CONFIG.QUALIFICATION_MIN_MESSAGES
  );

  return qualifyingSessions.length >= REFERRAL_CONFIG.QUALIFICATION_MIN_SESSIONS;
}
