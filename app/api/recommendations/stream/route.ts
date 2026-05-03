import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { matchResource, toCatalogResource } from "@/lib/recommendations/match";
import type {
  CatalogResource,
  RecommendationEvent,
  RecommendationPayload,
} from "@/lib/recommendations/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/recommendations/stream
 *
 * Streams Server-Sent Events that the chat surfaces (text, voice, video)
 * subscribe to right after a session ends. Mirrors the nansen-comp data_card
 * pattern so all three modes can render the same generative-UI card.
 *
 * Request body:
 *   {
 *     conversationId: string,            // owner-checked
 *     latestSummary?: string,            // optional override (this session's summary if known)
 *     latestInsights?: { type, content }[]
 *   }
 *
 * The matcher runs synchronously against:
 *   - User.profileSummary (existing)
 *   - latestSummary + latestInsights from the body (this session, before Inngest finishes)
 *   - recent moods across recent conversations
 *   - the user's history of dismissed / loved Recommendations (feedback loop)
 *   - the active Resource catalog
 *
 * If the matcher returns null we just emit `done` — the UI shows nothing
 * and navigates straight through.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = (await req.json().catch(() => ({}))) as {
    conversationId?: string;
    latestSummary?: string;
    latestInsights?: Array<{ type: string; content: string }>;
  };
  const conversationId = body.conversationId;
  if (!conversationId) {
    return Response.json(
      { error: "conversationId is required" },
      { status: 400 }
    );
  }

  // Ownership check before we run any LLM calls.
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, summary: true },
  });
  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: RecommendationEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          /* controller may already be closed */
        }
      };

      try {
        send({ type: "thinking" });

        // Pull all the inputs the matcher needs in parallel.
        const [user, recentConvs, feedbackHistory, catalogRows] =
          await Promise.all([
            prisma.user.findUnique({
              where: { id: userId },
              select: { profileSummary: true },
            }),
            prisma.conversation.findMany({
              where: { userId },
              orderBy: { updatedAt: "desc" },
              select: { moods: true },
              take: 5,
            }),
            prisma.recommendation.findMany({
              where: { userId, feedback: { not: null } },
              select: { resourceId: true, feedback: true },
              orderBy: { feedbackAt: "desc" },
              take: 50,
            }),
            prisma.resource.findMany({
              where: { isActive: true },
              select: {
                id: true,
                type: true,
                title: true,
                author: true,
                url: true,
                blurb: true,
                themes: true,
                why: true,
                audioUrl: true,
                bodyText: true,
                bodyKind: true,
                bodySource: true,
              },
            }),
          ]);

        const recentMoods = Array.from(
          new Set(recentConvs.flatMap((c) => c.moods))
        );
        const dismissedResourceIds = feedbackHistory
          .filter((r) => r.feedback === "not_for_me")
          .map((r) => r.resourceId);
        const lovedResourceIds = feedbackHistory
          .filter((r) => r.feedback === "helpful")
          .map((r) => r.resourceId);

        const catalog: CatalogResource[] = catalogRows.map(toCatalogResource);

        const result = await matchResource({
          profileSummary: user?.profileSummary ?? null,
          latestSummary: body.latestSummary ?? conversation.summary ?? null,
          latestInsights: body.latestInsights,
          recentMoods,
          dismissedResourceIds,
          lovedResourceIds,
          catalog,
        });

        if (!result) {
          send({ type: "done" });
          controller.close();
          return;
        }

        const resource = catalogRows.find((r) => r.id === result.resourceId);
        if (!resource) {
          // Defensive — matchResource already validates, but if it slips through
          // we just emit done rather than persisting a dangling row.
          send({ type: "done" });
          controller.close();
          return;
        }

        // Persist the recommendation so the entry-detail page can render it
        // again later and the feedback loop has somewhere to write.
        const row = await prisma.recommendation.create({
          data: {
            userId,
            conversationId,
            resourceId: resource.id,
            reason: result.reason,
          },
          select: { id: true },
        });

        const payload: RecommendationPayload = {
          recommendationId: row.id,
          resource: {
            id: resource.id,
            type: resource.type as RecommendationPayload["resource"]["type"],
            title: resource.title,
            author: resource.author,
            url: resource.url,
            blurb: resource.blurb,
            audioUrl: resource.audioUrl,
            bodyText: resource.bodyText,
            bodyKind:
              resource.bodyKind === "passage" || resource.bodyKind === "commentary"
                ? resource.bodyKind
                : null,
            bodySource: resource.bodySource,
          },
          reason: result.reason,
          feedback: null,
        };

        send({
          type: "data_card",
          data: { kind: "resource_recommendation", recommendation: payload },
        });
        send({ type: "done" });
        controller.close();
      } catch (err) {
        console.error("[recommendations/stream] error:", err);
        send({
          type: "error",
          message: err instanceof Error ? err.message : "match failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
