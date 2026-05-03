// Resource matcher — single LLM call over the whole catalog, returns one
// recommendation or null. Catalog at v1 size (~30-50) fits comfortably under
// context limits; we'll add embedding-based candidate retrieval when the
// catalog grows past ~100 items.

import type { CatalogResource, MatchInput, MatchResult } from "./types";

const MATCH_SYSTEM_PROMPT = `You are Sage, a Socratic AI mentor. You've just finished a conversation with this user. Your job: from the catalog below, pick AT MOST ONE resource that genuinely resonates with the pattern you noticed in their session.

Strong defaults:
- If nothing in the catalog truly fits, return null. Silence is better than a weak match.
- Never recommend a resource the user has already dismissed.
- If a similar resource was marked helpful before, lean toward the same theme.
- The "reason" must be one sentence Sage would actually say to the user. Tie it to what you noticed in the session — not generic blurbs. Examples of good reasons:
  - "You kept circling around how isolating it feels when others can't see what you see — this might name that experience."
  - "There's a thread here about hesitating to choose — this framework gives you a way through it."
- Output strict JSON — either { "resourceId": "<id>", "reason": "<one sentence>" } or null. No prose, no markdown, no explanation.`;

function buildUserMessage(input: MatchInput): string {
  const parts: string[] = [];

  if (input.profileSummary) {
    parts.push(`# What I know about this person\n${input.profileSummary}`);
  }

  if (input.latestSummary) {
    parts.push(`# This session's pattern summary\n${input.latestSummary}`);
  }

  if (input.latestInsights && input.latestInsights.length > 0) {
    const lines = input.latestInsights
      .map((i) => `- (${i.type}) ${i.content}`)
      .join("\n");
    parts.push(`# Insights from this session\n${lines}`);
  }

  if (input.recentMoods && input.recentMoods.length > 0) {
    parts.push(`# Recent moods\n${input.recentMoods.join(", ")}`);
  }

  if (input.dismissedResourceIds && input.dismissedResourceIds.length > 0) {
    parts.push(
      `# Resources the user has already dismissed (do NOT recommend any of these)\n${input.dismissedResourceIds.join(", ")}`
    );
  }

  if (input.lovedResourceIds && input.lovedResourceIds.length > 0) {
    parts.push(
      `# Resources the user marked helpful before (lean toward similar themes)\n${input.lovedResourceIds.join(", ")}`
    );
  }

  parts.push(
    `# Catalog\n${JSON.stringify(input.catalog, null, 2)}`
  );

  parts.push(
    `Now pick the single best resource for what you noticed in this session, or return null. Respond with strict JSON only.`
  );

  return parts.join("\n\n");
}

/** Strip unparseable wrapper text and return the inner JSON if present. */
function extractJson(content: string): string | null {
  const trimmed = content.trim();
  if (trimmed === "null") return "null";
  // Strip markdown fences if the model added them despite instructions.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

/**
 * Match a single resource for the user. Returns null when:
 *   - catalog is empty
 *   - LLM returns null (no good match)
 *   - LLM returns a resourceId that isn't in the catalog (defensive)
 *   - LLM returns the resource the user already dismissed (defensive)
 *   - any LLM/parse error (caller decides whether to retry)
 *
 * Pure-ish: takes input + a fetch function + an api key, no global lookups.
 * The optional `fetchImpl` lets tests stub network without touching globals.
 */
export async function matchResource(
  input: MatchInput,
  opts?: {
    apiKey?: string;
    model?: string;
    fetchImpl?: typeof fetch;
    siteUrl?: string;
  }
): Promise<MatchResult | null> {
  if (input.catalog.length === 0) return null;

  const apiKey = opts?.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[match] OPENROUTER_API_KEY missing — skipping match");
    return null;
  }

  const model = opts?.model ?? "openai/gpt-4o-mini";
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const siteUrl =
    opts?.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const dismissed = new Set(input.dismissedResourceIds ?? []);
  const catalogIds = new Set(input.catalog.map((r) => r.id));

  let response: Response;
  try {
    response = await fetchImpl(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": siteUrl,
          "X-Title": "Sage - Match Resource",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: MATCH_SYSTEM_PROMPT },
            { role: "user", content: buildUserMessage(input) },
          ],
          temperature: 0.4,
          max_tokens: 200,
        }),
      }
    );
  } catch (err) {
    console.error("[match] Network error:", err);
    return null;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[match] OpenRouter error", response.status, text.slice(0, 200));
    return null;
  }

  const data = (await response.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | null;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  const rawJson = extractJson(content);
  if (!rawJson || rawJson === "null") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.warn("[match] Could not parse model response as JSON:", rawJson.slice(0, 200));
    return null;
  }

  if (parsed === null) return null;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("resourceId" in parsed) ||
    !("reason" in parsed)
  ) {
    return null;
  }

  const candidate = parsed as { resourceId: unknown; reason: unknown };
  if (typeof candidate.resourceId !== "string" || typeof candidate.reason !== "string") {
    return null;
  }

  // Defensive guards in case the model ignores the "exclude dismissed" rule
  // or hallucinates a resource id.
  if (!catalogIds.has(candidate.resourceId)) {
    console.warn(
      "[match] Model picked unknown resourceId:",
      candidate.resourceId
    );
    return null;
  }
  if (dismissed.has(candidate.resourceId)) {
    console.warn("[match] Model picked dismissed resourceId — overriding to null");
    return null;
  }

  return { resourceId: candidate.resourceId, reason: candidate.reason };
}

/** Project a Prisma Resource row into the catalog shape the matcher reads. */
export function toCatalogResource(row: {
  id: string;
  type: string;
  title: string;
  author: string | null;
  blurb: string;
  themes: string[];
  why: string;
}): CatalogResource {
  return {
    id: row.id,
    type: row.type as CatalogResource["type"],
    title: row.title,
    author: row.author,
    blurb: row.blurb,
    themes: row.themes,
    why: row.why,
  };
}
