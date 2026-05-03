// Embedding helper. Wraps OpenAI's text-embedding-3-small so the matcher
// (and the seed script) have a single function for "turn this text into a
// vector." Returns null when no API key is configured or the call fails —
// callers fall back gracefully so the recommendation engine never breaks
// just because embeddings aren't available.
//
// We picked text-embedding-3-small because:
//   - 1536 dimensions is plenty for semantic similarity at our scale
//   - $0.02 per million tokens is effectively free for the catalog size
//   - it works with the standard OpenAI API surface (no special endpoints)
//
// Configurable via env: set EMBEDDING_MODEL_ID to swap models.

const DEFAULT_MODEL_ID =
  process.env.EMBEDDING_MODEL_ID ?? "text-embedding-3-small";
const ENDPOINT = "https://api.openai.com/v1/embeddings";

export interface EmbedOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

/** Compute an embedding vector for a string. Returns null on failure. */
export async function embedText(
  text: string,
  opts?: EmbedOptions
): Promise<number[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // No key — caller falls back. Don't log every call; the seed script
    // will surface this prominently when run without a key.
    return null;
  }
  const model = opts?.model ?? DEFAULT_MODEL_ID;
  const fetchImpl = opts?.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: trimmed,
        model,
        encoding_format: "float",
      }),
    });
  } catch (err) {
    console.error("[embed] network error:", err);
    return null;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      "[embed] OpenAI error",
      response.status,
      body.slice(0, 200)
    );
    return null;
  }

  const data = (await response.json().catch(() => null)) as
    | { data?: Array<{ embedding?: number[] }> }
    | null;
  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    console.error("[embed] empty/invalid embedding payload");
    return null;
  }
  return vector;
}

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** The model id we report alongside stored embeddings. */
export function currentEmbeddingModel(): string {
  return DEFAULT_MODEL_ID;
}
