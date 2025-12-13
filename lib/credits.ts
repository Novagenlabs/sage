import { prisma } from "./prisma";

const TOKENS_PER_CREDIT = 10;
export const FREE_CREDITS = 1000;

export function calculateCreditsUsed(
  promptTokens: number,
  completionTokens: number
): number {
  const totalTokens = promptTokens + completionTokens;
  return Math.ceil(totalTokens / TOKENS_PER_CREDIT);
}

export async function getUserCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits ?? 0;
}

export async function hasEnoughCredits(
  userId: string,
  estimatedCredits: number
): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits >= estimatedCredits;
}

export async function deductCredits(
  userId: string,
  creditsUsed: number,
  tokensUsed: number,
  type: "chat" | "voice",
  modelId?: string
): Promise<{ success: boolean; remainingCredits: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user || user.credits < creditsUsed) {
    return { success: false, remainingCredits: user?.credits ?? 0 };
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: creditsUsed } },
      select: { credits: true },
    }),
    prisma.usageRecord.create({
      data: {
        userId,
        type,
        tokensUsed,
        creditsUsed,
        modelId,
      },
    }),
  ]);

  return { success: true, remainingCredits: updatedUser.credits };
}

export async function addCredits(
  userId: string,
  credits: number
): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: credits } },
    select: { credits: true },
  });
  return user.credits;
}

export async function getUsageHistory(
  userId: string,
  limit: number = 50
): Promise<
  Array<{
    id: string;
    type: string;
    tokensUsed: number;
    creditsUsed: number;
    modelId: string | null;
    createdAt: Date;
  }>
> {
  return prisma.usageRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
