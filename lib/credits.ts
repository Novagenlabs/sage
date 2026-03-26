import { prisma } from "./prisma";

const TOKENS_PER_CREDIT = 10;
export const FREE_CREDITS = 200;

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

// --- Options-based deductCredits (new) ---

export interface DeductCreditsOptions {
  userId: string;
  creditsUsed: number;
  tokensUsed: number;
  type: string;
  service?: string;
  category?: string;
  modelId?: string;
  conversationId?: string;
  source?: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  isEstimate?: boolean;
  durationMs?: number;
  status?: string;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function deductCreditsWithOptions(
  options: DeductCreditsOptions
): Promise<{ success: boolean; remainingCredits: number; usageRecordId?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: options.userId },
    select: { credits: true },
  });

  if (!user || user.credits < options.creditsUsed) {
    return { success: false, remainingCredits: user?.credits ?? 0 };
  }

  const [updatedUser, usageRecord] = await prisma.$transaction([
    prisma.user.update({
      where: { id: options.userId },
      data: { credits: { decrement: options.creditsUsed } },
      select: { credits: true },
    }),
    prisma.usageRecord.create({
      data: {
        userId: options.userId,
        conversationId: options.conversationId,
        type: options.type,
        category: options.category || "user",
        service: options.service || "openrouter",
        tokensUsed: options.tokensUsed,
        promptTokens: options.promptTokens,
        completionTokens: options.completionTokens,
        creditsUsed: options.creditsUsed,
        costUsd: options.costUsd,
        modelId: options.modelId,
        source: options.source,
        isEstimate: options.isEstimate ?? false,
        durationMs: options.durationMs,
        status: options.status || "success",
        errorMessage: options.errorMessage,
        metadata: options.metadata ?? undefined,
      },
      select: { id: true },
    }),
  ]);

  return { success: true, remainingCredits: updatedUser.credits, usageRecordId: usageRecord.id };
}

// --- Record usage without deducting credits (for analytics-only records) ---

export async function recordUsage(
  options: Omit<DeductCreditsOptions, "creditsUsed"> & { creditsUsed?: number }
): Promise<string> {
  const record = await prisma.usageRecord.create({
    data: {
      userId: options.userId,
      conversationId: options.conversationId,
      type: options.type,
      category: options.category || "background",
      service: options.service || "openrouter",
      tokensUsed: options.tokensUsed,
      promptTokens: options.promptTokens,
      completionTokens: options.completionTokens,
      creditsUsed: options.creditsUsed ?? 0,
      costUsd: options.costUsd,
      modelId: options.modelId,
      source: options.source,
      isEstimate: options.isEstimate ?? false,
      durationMs: options.durationMs,
      status: options.status || "success",
      errorMessage: options.errorMessage,
      metadata: options.metadata ?? undefined,
    },
  });
  return record.id;
}

// --- Backward-compatible deductCredits (old signature) ---

export async function deductCredits(
  userId: string,
  creditsUsed: number,
  tokensUsed: number,
  type: "chat" | "voice",
  modelId?: string
): Promise<{ success: boolean; remainingCredits: number; usageRecordId?: string }>;

export async function deductCredits(
  userId: string,
  creditsUsed: number,
  tokensUsed: number,
  type: string,
  modelId?: string,
  extraOptions?: Partial<DeductCreditsOptions>
): Promise<{ success: boolean; remainingCredits: number; usageRecordId?: string }>;

export async function deductCredits(
  userId: string,
  creditsUsed: number,
  tokensUsed: number,
  type: string,
  modelId?: string,
  extraOptions?: Partial<DeductCreditsOptions>
): Promise<{ success: boolean; remainingCredits: number; usageRecordId?: string }> {
  return deductCreditsWithOptions({
    userId,
    creditsUsed,
    tokensUsed,
    type,
    modelId,
    ...extraOptions,
  });
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
