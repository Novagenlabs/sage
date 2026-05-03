// Resource matcher.
//
// Two paths:
//   - PRIMARY (when embeddings are populated on every catalog row AND the
//     user has signal to embed): cosine-sim candidate retrieval picks the
//     top 5 most-similar resources, then a small LLM call reranks those
//     5 picking the best (or null). This is the proper recommendation
//     architecture — semantic relevance does the heavy lifting, LLM
//     handles the "is this actually a good fit for *this* user" finishing
//     pass.
//
//   - LEGACY (when embeddings aren't available, e.g. OPENAI_API_KEY is
//     unset or the seed script hasn't run): fall through to the original
//     LLM-over-full-catalog path with theme-overlap fallback. Identical
//     behaviour to before embeddings shipped.
//
// Either way, exclusion rules (dismissed + already-recommended) apply to
// both paths.

import type { CatalogResource, MatchInput, MatchResult } from "./types";
import { cosineSimilarity, embedText } from "./embed-vector";

const MATCH_SYSTEM_PROMPT = `You are Sage, a Socratic AI mentor. You've just finished a conversation with this user. Your job: from the catalog below, pick the ONE resource most likely to be useful given the pattern you noticed in their session.

How to choose:
- PREFER recommending. If something in the catalog reasonably maps to anything the user is sitting with — even loosely — surface it. Most users WANT a recommendation; silence should be the rare exception.
- Only return null if literally nothing in the catalog has any thematic connection to the user's session at all. (This is rare — the catalog spans relationships, decisions, mortality, vulnerability, identity, calling, awakening, regret. Most conversations land somewhere on that map.)
- Never recommend a resource the user has already dismissed.
- If a similar resource was marked helpful before, lean toward the same theme.

How to write the reason:
- One sentence Sage would actually say to the user. Tie it to what you noticed in the session — not generic blurbs.
- Good examples:
  - "You kept circling around how isolating it feels when others can't see what you see — this might name that experience."
  - "There's a thread here about hesitating to choose — this framework gives you a way through it."

Output strict JSON — either { "resourceId": "<id>", "reason": "<one sentence>" } or null. No prose, no markdown, no explanation.`;

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
      `# Resources the user marked helpful before (lean toward similar themes — but do NOT recommend any of these specific items again)\n${input.lovedResourceIds.join(", ")}`
    );
  }

  if (
    input.alreadyRecommendedResourceIds &&
    input.alreadyRecommendedResourceIds.length > 0
  ) {
    parts.push(
      `# Resources already recommended to this user in past sessions (do NOT recommend any of these again)\n${input.alreadyRecommendedResourceIds.join(", ")}`
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
 * Deterministic fallback when the LLM either returns null or errors.
 *
 * Builds a haystack from all the user's free-text signal (profileSummary,
 * latestSummary, insight contents, moods) and scores each catalog
 * resource by how many of its theme tokens appear in that haystack. The
 * highest-scoring resource is returned; ties resolve to the most recently
 * created resource (most curated last).
 *
 * Returns null only when there is no haystack to match against (a
 * brand-new user with zero session signal) or no resource shares any
 * tokens with the haystack.
 *
 * Used so users with a real session don't leave empty-handed just
 * because the LLM was conservative on a particular call.
 */
export function themeOverlapFallback(input: MatchInput): MatchResult | null {
  // Same exclude rule as the LLM path — dismissed AND
  // already-recommended-this-user.
  const excluded = new Set([
    ...(input.dismissedResourceIds ?? []),
    ...(input.alreadyRecommendedResourceIds ?? []),
  ]);

  const haystack = [
    input.profileSummary ?? "",
    input.latestSummary ?? "",
    ...(input.latestInsights ?? []).map((i) => i.content),
    ...(input.recentMoods ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (!haystack.trim()) return null;

  // Tokenize a theme tag like "isolation-of-insight" into ["isolation",
  // "insight"] (stopwords + tiny tokens dropped). The catalog uses hyphenated
  // pattern-level tags, so this picks up e.g. "decision-paralysis" matching
  // either "decision" or "paralysis" in user text.
  const STOP = new Set([
    "of", "the", "a", "an", "and", "or", "as", "in", "on", "to", "for", "with",
    "is", "are", "be", "by", "vs", "at", "from", "into", "you", "your",
  ]);
  const tokenize = (theme: string) =>
    theme
      .toLowerCase()
      .split(/[-\s]+/)
      .filter((t) => t.length > 2 && !STOP.has(t));

  type Scored = { id: string; score: number; matchedThemes: string[] };
  const scored: Scored[] = [];
  for (const r of input.catalog) {
    if (excluded.has(r.id)) continue;
    const matched = r.themes.filter((theme) =>
      tokenize(theme).some((tok) => haystack.includes(tok))
    );
    if (matched.length > 0) {
      scored.push({ id: r.id, score: matched.length, matchedThemes: matched });
    }
  }
  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  // Soft, non-claimy reason — we're fallback-matching, not making a confident
  // pattern read. Pick the first matched theme (highest-signal token) as the
  // hook.
  const hook = top.matchedThemes[0].replace(/-/g, " ");
  return {
    resourceId: top.id,
    reason: `something about ${hook} keeps surfacing — this might be worth sitting with.`,
  };
}

/** Number of catalog resources we send to the LLM rerank pass. */
const RERANK_CANDIDATES = 5;

/**
 * Build the haystack we'll embed for the user — same shape as the
 * theme-overlap fallback's haystack, but kept as a structured paragraph
 * so it embeds well.
 */
function userHaystack(input: MatchInput): string {
  const parts: string[] = [];
  if (input.profileSummary) parts.push(input.profileSummary);
  if (input.latestSummary) parts.push(input.latestSummary);
  if (input.latestInsights && input.latestInsights.length > 0) {
    parts.push(input.latestInsights.map((i) => i.content).join(" "));
  }
  if (input.recentMoods && input.recentMoods.length > 0) {
    parts.push(`moods: ${input.recentMoods.join(", ")}`);
  }
  return parts.join("\n\n");
}

/**
 * Embedding-based candidate retrieval + LLM rerank.
 *
 * 1. Embed the user's session signal.
 * 2. Cosine-sim it against every NON-EXCLUDED catalog resource that has
 *    its own embedding.
 * 3. Top RERANK_CANDIDATES (5) get sent to a small LLM call that picks
 *    the best (or null) and writes the one-sentence "reason."
 *
 * Returns:
 *   - MatchResult on success
 *   - null when the LLM picks null AND the user has no other meaningful
 *     candidate (rare — there's almost always a top-cosine fallback)
 *   - "use-legacy" when embeddings aren't usable (no API key, no
 *     embeddings on the catalog rows, or the user signal couldn't be
 *     embedded). Caller falls back to the legacy LLM-over-full-catalog
 *     path.
 */
async function embedAndRank(
  input: MatchInput,
  opts: {
    embedFetch?: typeof fetch;
    rerankFetch?: typeof fetch;
    rerankModel?: string;
    apiKey?: string;
    siteUrl?: string;
    embeddingApiKey?: string;
  }
): Promise<MatchResult | null | "use-legacy"> {
  // Need at least one catalog row with an embedding to even try.
  const candidatesWithEmbeddings = input.catalog.filter(
    (r) => Array.isArray(r.embedding) && r.embedding.length > 0
  );
  if (candidatesWithEmbeddings.length === 0) return "use-legacy";

  const haystack = userHaystack(input);
  if (!haystack.trim()) return "use-legacy";

  const userVector = await embedText(haystack, {
    apiKey: opts.embeddingApiKey,
    fetchImpl: opts.embedFetch,
  });
  if (!userVector) return "use-legacy";

  const excluded = new Set([
    ...(input.dismissedResourceIds ?? []),
    ...(input.alreadyRecommendedResourceIds ?? []),
  ]);

  const scored = candidatesWithEmbeddings
    .filter((r) => !excluded.has(r.id))
    .map((r) => ({
      resource: r,
      score: cosineSimilarity(userVector, r.embedding!),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  const top = scored.slice(0, RERANK_CANDIDATES);

  // LLM rerank — small, fast, just picks the best of the top 5 and
  // writes a one-sentence reason. Same OpenRouter-via-chat-completions
  // surface as the legacy path.
  const apiKey = opts.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // No key for the rerank? Just take the top-cosine result.
    const t = top[0];
    return {
      resourceId: t.resource.id,
      reason: deterministicReason(t.resource),
    };
  }

  const fetchImpl = opts.rerankFetch ?? fetch;
  const siteUrl =
    opts.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const model = opts.rerankModel ?? "openai/gpt-4o-mini";

  const rerankPrompt = `You are Sage, a Socratic mentor. From the ${top.length} candidates below — already filtered as the most semantically similar to the user's recent conversations — pick the ONE most likely to resonate with what they're sitting with right now. Strongly prefer recommending; only return null if none of these even loosely fit.

Output JSON: { "resourceId": "...", "reason": "<one sentence in Sage's voice, tied to what you noticed>" } | null

[user signal]
${haystack}

[candidates]
${JSON.stringify(
  top.map((t) => ({
    id: t.resource.id,
    title: t.resource.title,
    author: t.resource.author,
    blurb: t.resource.blurb,
    themes: t.resource.themes,
    why: t.resource.why,
    similarity: t.score.toFixed(3),
  })),
  null,
  2
)}`;

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
          "X-Title": "Sage - Match (rerank)",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: rerankPrompt }],
          temperature: 0.4,
          max_tokens: 200,
        }),
      }
    );
  } catch (err) {
    console.error("[match/rerank] network error:", err);
    // Top-cosine candidate is still a sensible fallback.
    const t = top[0];
    return {
      resourceId: t.resource.id,
      reason: deterministicReason(t.resource),
    };
  }

  if (!response.ok) {
    const t = top[0];
    return {
      resourceId: t.resource.id,
      reason: deterministicReason(t.resource),
    };
  }
  const data = (await response.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | null;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    const t = top[0];
    return {
      resourceId: t.resource.id,
      reason: deterministicReason(t.resource),
    };
  }

  const rawJson = extractJson(content);
  if (!rawJson || rawJson === "null") {
    // LLM said null. Top-cosine is still our best guess.
    const t = top[0];
    return {
      resourceId: t.resource.id,
      reason: deterministicReason(t.resource),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    const t = top[0];
    return {
      resourceId: t.resource.id,
      reason: deterministicReason(t.resource),
    };
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("resourceId" in parsed) ||
    !("reason" in parsed)
  ) {
    const t = top[0];
    return {
      resourceId: t.resource.id,
      reason: deterministicReason(t.resource),
    };
  }

  const candidate = parsed as { resourceId: unknown; reason: unknown };
  if (
    typeof candidate.resourceId !== "string" ||
    typeof candidate.reason !== "string"
  ) {
    const t = top[0];
    return {
      resourceId: t.resource.id,
      reason: deterministicReason(t.resource),
    };
  }

  // Validate against the candidate set (model can't pick outside the top
  // RERANK_CANDIDATES we sent).
  const allowed = new Set(top.map((t) => t.resource.id));
  if (!allowed.has(candidate.resourceId) || excluded.has(candidate.resourceId)) {
    const t = top[0];
    return {
      resourceId: t.resource.id,
      reason: deterministicReason(t.resource),
    };
  }

  return { resourceId: candidate.resourceId, reason: candidate.reason };
}

/** Soft auto-generated reason when we don't have an LLM-written one. */
function deterministicReason(r: CatalogResource): string {
  const hook = r.themes[0]?.replace(/-/g, " ");
  return hook
    ? `there's something around ${hook} in what you've been sitting with — this might land.`
    : `this came up as a close match to what you've been sitting with.`;
}

/**
 * Match a single resource for the user.
 *
 * Tries the embedding path first; if embeddings aren't available, falls
 * through to the legacy LLM-over-full-catalog path with theme-overlap
 * fallback. Either way, dismissed and already-recommended resources are
 * excluded.
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
    /** Override OpenAI key for embeddings (test injection point). */
    embeddingApiKey?: string;
    /** Stub for the OpenAI embeddings endpoint (test injection). */
    embedFetch?: typeof fetch;
  }
): Promise<MatchResult | null> {
  if (input.catalog.length === 0) return null;

  // Try the embedding path first. Only falls through to the legacy path
  // when no catalog rows have embeddings, the user has no signal, or the
  // embedding API is unconfigured.
  const embeddingResult = await embedAndRank(input, {
    apiKey: opts?.apiKey,
    embeddingApiKey: opts?.embeddingApiKey,
    embedFetch: opts?.embedFetch,
    rerankFetch: opts?.fetchImpl,
    rerankModel: opts?.model,
    siteUrl: opts?.siteUrl,
  });
  if (embeddingResult !== "use-legacy") return embeddingResult;

  const apiKey = opts?.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[match] OPENROUTER_API_KEY missing — skipping match");
    return null;
  }

  const model = opts?.model ?? "openai/gpt-4o-mini";
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const siteUrl =
    opts?.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Single combined exclude set — anything dismissed, anything previously
  // recommended (even successfully). Used for guard + fallback so they
  // can't disagree.
  const excluded = new Set([
    ...(input.dismissedResourceIds ?? []),
    ...(input.alreadyRecommendedResourceIds ?? []),
  ]);
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
    return themeOverlapFallback(input);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[match] OpenRouter error", response.status, text.slice(0, 200));
    return themeOverlapFallback(input);
  }

  const data = (await response.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | null;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return themeOverlapFallback(input);

  const rawJson = extractJson(content);
  if (!rawJson || rawJson === "null") return themeOverlapFallback(input);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.warn("[match] Could not parse model response as JSON:", rawJson.slice(0, 200));
    return themeOverlapFallback(input);
  }

  if (parsed === null) return themeOverlapFallback(input);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("resourceId" in parsed) ||
    !("reason" in parsed)
  ) {
    return themeOverlapFallback(input);
  }

  const candidate = parsed as { resourceId: unknown; reason: unknown };
  if (typeof candidate.resourceId !== "string" || typeof candidate.reason !== "string") {
    return themeOverlapFallback(input);
  }

  // Defensive guards in case the model ignores the "exclude dismissed" rule
  // or hallucinates a resource id.
  if (!catalogIds.has(candidate.resourceId)) {
    console.warn(
      "[match] Model picked unknown resourceId:",
      candidate.resourceId
    );
    return themeOverlapFallback(input);
  }
  if (excluded.has(candidate.resourceId)) {
    console.warn(
      "[match] Model picked excluded resourceId (dismissed or already recommended) — overriding to fallback"
    );
    return themeOverlapFallback({
      ...input,
      dismissedResourceIds: [
        ...(input.dismissedResourceIds ?? []),
        candidate.resourceId,
      ],
    });
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
  embedding?: unknown;
}): CatalogResource {
  // The DB stores Json; normalise to number[] | null so the matcher can
  // safely check Array.isArray without leaking the JsonValue type.
  let embedding: number[] | null = null;
  if (Array.isArray(row.embedding) && row.embedding.length > 0) {
    if (row.embedding.every((v) => typeof v === "number")) {
      embedding = row.embedding as number[];
    }
  }
  return {
    id: row.id,
    type: row.type as CatalogResource["type"],
    title: row.title,
    author: row.author,
    blurb: row.blurb,
    themes: row.themes,
    why: row.why,
    embedding,
  };
}
