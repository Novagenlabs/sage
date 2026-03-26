import { auth } from "@/auth";
import { deductCreditsWithOptions } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  amount: number;
  conversationId?: string;
  type?: string;
  durationSeconds?: number;
}

/**
 * POST /api/credits/deduct
 * Simple post-call credit deduction for voice sessions.
 * Called by the client after the countdown timer ends.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const body: RequestBody = await request.json();
    const { amount, conversationId, type = "voice", durationSeconds } = body;

    if (!amount || amount <= 0) {
      return Response.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    const result = await deductCreditsWithOptions({
      userId: session.user.id,
      creditsUsed: Math.ceil(amount),
      tokensUsed: 0,
      type,
      service: "livekit",
      category: "user",
      conversationId: conversationId || undefined,
      source: "api/credits/deduct",
      isEstimate: false,
      durationMs: durationSeconds ? durationSeconds * 1000 : undefined,
    });

    if (!result.success) {
      return Response.json(
        { error: "Insufficient credits", remainingCredits: result.remainingCredits },
        { status: 402 }
      );
    }

    return Response.json({
      success: true,
      creditsDeducted: Math.ceil(amount),
      remainingCredits: result.remainingCredits,
    });
  } catch (error) {
    console.error("[Credits/Deduct] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Failed to deduct credits: ${message}` },
      { status: 500 }
    );
  }
}
