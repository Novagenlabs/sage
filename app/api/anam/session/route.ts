import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasEnoughCredits } from "@/lib/credits";
import { buildSystemPrompt, type ConversationContext } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANAM_API = "https://api.anam.ai/v1/auth/session-token";

// Default Anam IDs — placeholder until the team picks a calmer mentor
// avatar from Anam's library. Override via env.
const DEFAULT_AVATAR_ID = "edf6fdcb-acab-44b8-b974-ded72665ee26";
const DEFAULT_VOICE_ID = "de23e340-1416-4dd8-977d-065a7ca11697";
const MIN_CREDITS = 5; // floor to start a session at all

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Please sign in to start a video session." }, { status: 401 });
  }

  const userId = session.user.id;

  if (!(await hasEnoughCredits(userId, MIN_CREDITS))) {
    return Response.json(
      { error: "You're out of credits. Top up to start a video session." },
      { status: 402 }
    );
  }

  const apiKey = process.env.ANAM_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Video service is not configured." }, { status: 500 });
  }

  // Build the context Sage already uses for text + voice — same prompt,
  // same memory of the user, just delivered via an avatar.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, profileSummary: true },
  });

  const recent = await prisma.conversation.findMany({
    where: { userId, summary: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, summary: true, updatedAt: true },
    take: 5,
  });

  const context: ConversationContext = {
    userName: user?.name ?? null,
    profileSummary: user?.profileSummary ?? null,
    recentSummaries: recent.map((r) => ({
      id: r.id,
      title: r.title ?? "",
      summary: r.summary ?? "",
      updatedAt: r.updatedAt.toISOString(),
    })),
  };

  const systemPrompt = buildSystemPrompt("opening", undefined, context);

  // Create the Conversation row up front so the session has somewhere
  // to land its summary when it ends. Mark it active.
  await prisma.conversation.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: "Video session",
      phase: "opening",
      isActive: true,
    },
  });

  const avatarId = process.env.ANAM_AVATAR_ID || DEFAULT_AVATAR_ID;
  const voiceId = process.env.ANAM_VOICE_ID || DEFAULT_VOICE_ID;

  // LLM mode:
  //   - Hosted (default in dev): set ANAM_LLM_ID to one of Anam's built-in
  //     models e.g. "ANAM_GPT_4O_MINI_V1". No proxy needed; Anam handles
  //     turns themselves using our systemPrompt.
  //   - Customer LLM (recommended for prod): set ANAM_LLM_ID="CUSTOMER_CLIENT_V1"
  //     and configure Anam's dashboard to call our /api/anam/chat proxy. Lets
  //     Sage's video persona share the exact model + per-turn behaviour as text.
  const llmId = process.env.ANAM_LLM_ID || "ANAM_GPT_4O_MINI_V1";

  let resp: Response;
  try {
    resp = await fetch(ANAM_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personaConfig: {
          name: "Sage",
          avatarId,
          voiceId,
          llmId,
          systemPrompt,
        },
      }),
    });
  } catch (err) {
    console.error("[Anam] Network error contacting Anam:", err);
    return Response.json({ error: "Couldn't reach the video service." }, { status: 502 });
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("[Anam] Token mint failed:", resp.status, text);
    return Response.json(
      { error: "Couldn't start a video session right now." },
      { status: 502 }
    );
  }

  const data = (await resp.json()) as { sessionToken?: string };
  if (!data.sessionToken) {
    return Response.json({ error: "Video service returned no token." }, { status: 502 });
  }

  return Response.json({
    sessionToken: data.sessionToken,
    conversationId: conversation.id,
  });
}
