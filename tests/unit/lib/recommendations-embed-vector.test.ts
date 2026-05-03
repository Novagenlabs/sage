import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cosineSimilarity, embedText } from "@/lib/recommendations/embed-vector";

describe("cosineSimilarity", () => {
  it("returns 1 for identical unit vectors", () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 6);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 6);
  });

  it("returns 0 for empty / mismatched-length / zero-magnitude vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
  });
});

describe("embedText", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test";
  });
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  it("returns null for empty input without an API call", async () => {
    const fetchImpl = vi.fn();
    expect(
      await embedText("", { fetchImpl: fetchImpl as unknown as typeof fetch })
    ).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns null when no API key is configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const fetchImpl = vi.fn();
    expect(
      await embedText("hello", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts to the OpenAI embeddings endpoint and returns the vector", async () => {
    const vector = Array.from({ length: 1536 }, (_, i) => i / 1536);
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ data: [{ embedding: vector }] }),
        { status: 200 }
      )
    );
    const result = await embedText("hello world", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual(vector);
    const call = fetchImpl.mock.calls[0];
    expect(call[0]).toBe("https://api.openai.com/v1/embeddings");
    const init = call[1] as { headers: Record<string, string>; body: string };
    expect(init.headers["Authorization"]).toBe("Bearer sk-test");
    const body = JSON.parse(init.body) as { input: string; model: string };
    expect(body.input).toBe("hello world");
    expect(body.model).toBe("text-embedding-3-small");
  });

  it("returns null on non-OK response", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));
    expect(
      await embedText("hi", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).toBeNull();
  });

  it("returns null on malformed payload", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ wrong: "shape" }), { status: 200 })
    );
    expect(
      await embedText("hi", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).toBeNull();
  });
});
