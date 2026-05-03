import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  matchResource,
  themeOverlapFallback,
} from "@/lib/recommendations/match";
import type { CatalogResource } from "@/lib/recommendations/types";

const CATALOG: CatalogResource[] = [
  {
    id: "r_decision",
    type: "article",
    title: "10/10/10",
    author: "Suzy Welch",
    blurb: "Decision framework: 10 minutes, 10 months, 10 years.",
    themes: ["decision-paralysis", "decision-making", "perspective"],
    why: "When stuck on a decision because the immediate weight crowds out everything.",
  },
  {
    id: "r_isolation",
    type: "video",
    title: "Plato's Allegory of the Cave",
    author: "TED-Ed",
    blurb: "Prisoners and shadows.",
    themes: ["isolation-of-insight", "awakening", "alienation-from-others"],
    why: "When someone has 'seen something' and feels lonely with that seeing.",
  },
  {
    id: "r_decision_alt",
    type: "book",
    title: "The Paradox of Choice",
    author: "Barry Schwartz",
    blurb: "Why too many options paralyze.",
    themes: ["decision-paralysis", "regret", "freedom-as-constraint"],
    why: "When the issue isn't a lack of options but their abundance.",
  },
];

const baseInput = {
  profileSummary: null,
  latestSummary: null,
  latestInsights: [],
  recentMoods: [],
  catalog: CATALOG,
};

function stubFetchOnce(content: string | null) {
  // The matcher emits null for null content responses too — we model both
  // success-with-null and success-with-pick variants.
  return vi.fn(async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: content ?? "null" } }],
      }),
      { status: 200 }
    )
  );
}

describe("matchResource", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the catalog is empty (no LLM call)", async () => {
    const fetchImpl = vi.fn();
    const result = await matchResource(
      { ...baseInput, catalog: [] },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns null when no API key is configured", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const fetchImpl = vi.fn();
    const result = await matchResource(baseInput, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns null when the LLM responds with null (no good match)", async () => {
    const fetchImpl = stubFetchOnce("null");
    const result = await matchResource(baseInput, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it("picks the matching resource when the LLM returns one", async () => {
    const fetchImpl = stubFetchOnce(
      JSON.stringify({
        resourceId: "r_decision",
        reason: "you keep circling around a choice — this gives you a way through.",
      })
    );
    const result = await matchResource(baseInput, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).not.toBeNull();
    expect(result?.resourceId).toBe("r_decision");
    expect(result?.reason).toMatch(/circling/);
  });

  it("strips markdown fences if the model wraps the JSON", async () => {
    const fetchImpl = stubFetchOnce(
      "```json\n" +
        JSON.stringify({
          resourceId: "r_isolation",
          reason: "the loneliness of seeing what others can't.",
        }) +
        "\n```"
    );
    const result = await matchResource(baseInput, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result?.resourceId).toBe("r_isolation");
  });

  it("ignores hallucinated resourceIds that aren't in the catalog", async () => {
    const fetchImpl = stubFetchOnce(
      JSON.stringify({ resourceId: "r_does_not_exist", reason: "nope." })
    );
    const result = await matchResource(baseInput, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it("overrides the model if it picks a resource the user has dismissed", async () => {
    const fetchImpl = stubFetchOnce(
      JSON.stringify({
        resourceId: "r_decision",
        reason: "this is the one.",
      })
    );
    const result = await matchResource(
      { ...baseInput, dismissedResourceIds: ["r_decision"] },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result).toBeNull();
  });

  it("returns null on non-OK response", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));
    const result = await matchResource(baseInput, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it("returns null on malformed JSON content", async () => {
    const fetchImpl = stubFetchOnce("definitely not json");
    const result = await matchResource(baseInput, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it("falls back to theme overlap when the LLM returns null and the user has signal", async () => {
    const fetchImpl = stubFetchOnce("null");
    const result = await matchResource(
      {
        ...baseInput,
        // User signal includes "decision" — should match r_decision /
        // r_decision_alt themes via the haystack tokenizer.
        profileSummary:
          "tends to spiral when there's a decision in front of them and gets stuck on whether they're picking the right one.",
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result).not.toBeNull();
    // Either decision-themed resource is acceptable.
    expect(["r_decision", "r_decision_alt"]).toContain(result?.resourceId);
    expect(result?.reason).toMatch(/decision/i);
  });

  it("falls back to theme overlap on non-OK API responses too", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));
    const result = await matchResource(
      {
        ...baseInput,
        profileSummary: "feels deeply alone in their insight, can't get others to see it",
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result?.resourceId).toBe("r_isolation");
  });

  it("excludes resources already recommended in past sessions", async () => {
    // LLM picks r_decision but it was already recommended last week →
    // matcher should override and reach for r_decision_alt via fallback.
    const fetchImpl = stubFetchOnce(
      JSON.stringify({
        resourceId: "r_decision",
        reason: "fits the decision pattern.",
      })
    );
    const result = await matchResource(
      {
        ...baseInput,
        profileSummary: "spirals on every decision, regret afterward",
        alreadyRecommendedResourceIds: ["r_decision"],
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result?.resourceId).toBe("r_decision_alt");
  });

  it("fallback excludes already-recommended resources too", () => {
    const result = themeOverlapFallback({
      profileSummary: "alienation, awakening, isolation",
      catalog: CATALOG,
      alreadyRecommendedResourceIds: ["r_isolation"],
    });
    // Only r_isolation overlaps; excluding it nulls out.
    expect(result).toBeNull();
  });

  it("fallback excludes dismissed resources", async () => {
    const fetchImpl = stubFetchOnce("null");
    const result = await matchResource(
      {
        ...baseInput,
        profileSummary: "spiral on decisions, paralysis, regret",
        dismissedResourceIds: ["r_decision"],
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result?.resourceId).toBe("r_decision_alt");
  });

  it("fallback returns null only when there's no signal at all", async () => {
    const fetchImpl = stubFetchOnce("null");
    const result = await matchResource(baseInput, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    // baseInput has empty haystack — fallback also returns null.
    expect(result).toBeNull();
  });

  it("includes dismissed + loved ids in the LLM prompt body", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "null" } }] }), {
        status: 200,
      })
    );
    await matchResource(
      {
        ...baseInput,
        dismissedResourceIds: ["r_decision"],
        lovedResourceIds: ["r_isolation"],
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    const call = fetchImpl.mock.calls[0];
    const init = call[1] as { body: string };
    expect(init.body).toContain("r_decision");
    expect(init.body).toContain("r_isolation");
    expect(init.body).toContain("dismissed");
    expect(init.body).toContain("helpful");
  });
});

describe("matchResource — embedding path", () => {
  // Canonical 4-dim vectors so cosine similarity is easy to reason about.
  // r_isolation gets a vector aligned with [0,0,0,1] (axis "isolation");
  // r_decision aligns with [1,0,0,0]; r_decision_alt aligns with [0.9, 0.4, 0, 0]
  // (close to r_decision but distinct).
  const EMBED_CATALOG: CatalogResource[] = CATALOG.map((r, i) => {
    const vectors: number[][] = [
      [1, 0, 0, 0],         // r_decision
      [0, 0, 0, 1],         // r_isolation
      [0.9, 0.4, 0, 0],     // r_decision_alt — close to r_decision
    ];
    return { ...r, embedding: vectors[i] };
  });

  function stubEmbedFetch(vector: number[]) {
    return vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ embedding: vector }] }), {
        status: 200,
      })
    );
  }

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test";
  });
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("uses cosine retrieval + LLM rerank when embeddings are present", async () => {
    // User vector aligned with r_decision (axis 0). LLM rerank picks
    // r_decision from the top candidates.
    const embedFetch = stubEmbedFetch([1, 0, 0, 0]);
    const rerankFetch = stubFetchOnce(
      JSON.stringify({
        resourceId: "r_decision",
        reason: "the decision tension surfaced clearly here.",
      })
    );
    const result = await matchResource(
      {
        ...baseInput,
        catalog: EMBED_CATALOG,
        profileSummary:
          "decision paralysis around a job change, going back and forth",
      },
      {
        embedFetch: embedFetch as unknown as typeof fetch,
        fetchImpl: rerankFetch as unknown as typeof fetch,
      }
    );
    expect(result?.resourceId).toBe("r_decision");
  });

  it("falls back to top-cosine when the LLM rerank returns null", async () => {
    const embedFetch = stubEmbedFetch([0, 0, 0, 1]); // aligned with r_isolation
    const rerankFetch = stubFetchOnce("null");
    const result = await matchResource(
      {
        ...baseInput,
        catalog: EMBED_CATALOG,
        profileSummary: "feels alone in seeing what others can't",
      },
      {
        embedFetch: embedFetch as unknown as typeof fetch,
        fetchImpl: rerankFetch as unknown as typeof fetch,
      }
    );
    expect(result?.resourceId).toBe("r_isolation");
  });

  it("excludes already-recommended ids from the candidate set", async () => {
    const embedFetch = stubEmbedFetch([1, 0, 0, 0]); // aligned with r_decision
    const rerankFetch = stubFetchOnce("null");
    const result = await matchResource(
      {
        ...baseInput,
        catalog: EMBED_CATALOG,
        profileSummary: "decision paralysis",
        alreadyRecommendedResourceIds: ["r_decision"],
      },
      {
        embedFetch: embedFetch as unknown as typeof fetch,
        fetchImpl: rerankFetch as unknown as typeof fetch,
      }
    );
    // Top-cosine after excluding r_decision is r_decision_alt.
    expect(result?.resourceId).toBe("r_decision_alt");
  });

  it("falls through to the legacy path when no catalog rows have embeddings", async () => {
    // No embedding on catalog → embedAndRank returns "use-legacy" → legacy
    // LLM-over-full-catalog runs (with the catalog as-is).
    const rerankFetch = stubFetchOnce(
      JSON.stringify({
        resourceId: "r_decision",
        reason: "fits.",
      })
    );
    const result = await matchResource(
      {
        ...baseInput,
        catalog: CATALOG, // no embeddings
        profileSummary: "decision paralysis",
      },
      { fetchImpl: rerankFetch as unknown as typeof fetch }
    );
    expect(result?.resourceId).toBe("r_decision");
  });

  it("falls through to legacy when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    // catalog has embeddings but we can't embed the user signal → legacy
    const rerankFetch = stubFetchOnce(
      JSON.stringify({
        resourceId: "r_decision",
        reason: "fits.",
      })
    );
    const embedFetch = vi.fn();
    const result = await matchResource(
      {
        ...baseInput,
        catalog: EMBED_CATALOG,
        profileSummary: "decision paralysis",
      },
      {
        embedFetch: embedFetch as unknown as typeof fetch,
        fetchImpl: rerankFetch as unknown as typeof fetch,
      }
    );
    expect(result?.resourceId).toBe("r_decision");
    // Embedding endpoint never called because there's no OPENAI key.
    expect(embedFetch).not.toHaveBeenCalled();
  });
});

describe("themeOverlapFallback", () => {
  it("returns null when there's no haystack signal", () => {
    const result = themeOverlapFallback({
      profileSummary: null,
      catalog: CATALOG,
    });
    expect(result).toBeNull();
  });

  it("returns null when nothing in the catalog overlaps", () => {
    const result = themeOverlapFallback({
      profileSummary: "thinking about quantum mechanics and macroeconomics today",
      catalog: CATALOG,
    });
    expect(result).toBeNull();
  });

  it("picks the resource with the most theme overlap", () => {
    const result = themeOverlapFallback({
      profileSummary: "feels alienated, sees what others don't, awakening",
      catalog: CATALOG,
    });
    expect(result?.resourceId).toBe("r_isolation");
    // Reason embeds whichever theme token actually showed up first.
    expect(result?.reason.toLowerCase()).toMatch(
      /awakening|alienation|isolation|insight/
    );
  });

  it("excludes dismissed resources even on a fallback match", () => {
    const result = themeOverlapFallback({
      profileSummary: "alienation, awakening, isolation",
      catalog: CATALOG,
      dismissedResourceIds: ["r_isolation"],
    });
    // Only r_isolation matches that text, so excluding it should null out.
    expect(result).toBeNull();
  });
});
