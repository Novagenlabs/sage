// Shared types for the recommendation engine. All three chat surfaces (text,
// voice, video) and the entry-detail page consume RecommendationPayload, so
// it lives here rather than in any one route.

export type ResourceType =
  | "book"
  | "article"
  | "lecture"
  | "podcast"
  | "video"
  | "audiobook";

/** A row from the Resource catalog, projected for the matcher prompt. */
export interface CatalogResource {
  id: string;
  type: ResourceType;
  title: string;
  author: string | null;
  blurb: string;
  themes: string[];
  why: string;
  /** Pre-computed embedding from scripts/embed-resources. When present on
   *  every catalog row, the matcher uses cosine-sim candidate retrieval +
   *  LLM rerank instead of LLM-over-full-catalog. */
  embedding?: number[] | null;
}

/** Inputs the matcher reads on every call. The caller assembles them. */
export interface MatchInput {
  /** Consolidated user pattern summary (`User.profileSummary`). */
  profileSummary: string | null;
  /** The just-ended conversation's pattern summary, if it exists yet. */
  latestSummary?: string | null;
  /** Per-session insight strings (typed: realization/assumption/pattern/question). */
  latestInsights?: Array<{ type: string; content: string }>;
  /** Mood chips the user has tagged on recent sessions. */
  recentMoods?: string[];
  /** Resources the user has marked "not_for_me" — exclude from matching. */
  dismissedResourceIds?: string[];
  /** Resources the user has marked "helpful" — bias toward similar themes. */
  lovedResourceIds?: string[];
  /** Resources Sage has previously recommended to this user, regardless of
   *  whether they gave feedback. Excluded from new matches so the user
   *  doesn't keep getting the same recommendation across sessions. */
  alreadyRecommendedResourceIds?: string[];
  /** Full active catalog. v1 caps at ~30-50 entries so it fits in one prompt. */
  catalog: CatalogResource[];
}

/** Matcher output. `null` means "no good fit" — silence is intentional. */
export interface MatchResult {
  resourceId: string;
  /** Sage's one-sentence "why I'm suggesting this," tied back to what was noticed. */
  reason: string;
}

/** What the SSE endpoint streams to the client and what the card renders. */
export interface RecommendationPayload {
  /** The Recommendation row id — used by feedback/click endpoints. */
  recommendationId: string;
  resource: {
    id: string;
    type: ResourceType;
    title: string;
    author: string | null;
    url: string;
    blurb: string;
    /** Path under /public to a Sage-narrated MP3 intro (~30-50s). Optional. */
    audioUrl?: string | null;
    /** Sage's transformative reading of the work — original commentary,
     *  cited via bodySource and linked via url. Renders inline in the
     *  player so the user always has something to read in-app even if the
     *  external URL goes stale. Optional. */
    bodyText?: string | null;
    /** "passage" = excerpt of an original; "commentary" = Sage's reading;
     *  null = no inline body. */
    bodyKind?: "passage" | "commentary" | null;
    /** Citation, e.g. "Marcus Aurelius, Meditations, trans. Long, 1862". */
    bodySource?: string | null;
  };
  reason: string;
  /** Already-recorded feedback if the user opens the entry-detail later. */
  feedback?: "helpful" | "not_for_me" | null;
}

/** SSE events emitted by /api/recommendations/stream. */
export type RecommendationEvent =
  | { type: "thinking" }
  | {
      type: "data_card";
      data: { kind: "resource_recommendation"; recommendation: RecommendationPayload };
    }
  | { type: "done" }
  | { type: "error"; message: string };
