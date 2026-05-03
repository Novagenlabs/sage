import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matchResource } from "@/lib/recommendations/match";
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
