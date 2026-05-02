// Customer-LLM proxy for Anam's CUSTOMER_CLIENT_V1 mode.
// Anam calls this endpoint with an OpenAI-shape /v1/chat/completions request
// when the avatar needs Sage's next reply. We forward verbatim to OpenRouter
// and stream the response straight back, so the avatar lip-syncs to whatever
// Sage's text/voice modes would say in the same context.
//
// Configure Anam's customer-LLM endpoint to point at /api/anam/chat in their
// dashboard (or via the platform-side LLM_BASE_URL env when minting tokens).
//
// Auth note: this endpoint cannot use NextAuth cookies — Anam's servers call
// it. We protect it via a shared secret (ANAM_PROXY_SECRET) that Anam attaches
// as a bearer token. If the secret isn't configured we accept all requests
// (dev convenience), but log loudly.
import { DEFAULT_MODEL } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OpenRouter is not configured." }, { status: 500 });
  }

  const expectedSecret = process.env.ANAM_PROXY_SECRET;
  if (expectedSecret) {
    const auth = req.headers.get("authorization") ?? "";
    const got = auth.replace(/^Bearer\s+/i, "");
    if (got !== expectedSecret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[anam/chat] ANAM_PROXY_SECRET unset — accepting all requests.");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Force our default model unless Anam explicitly asked for one.
  const payload = {
    ...body,
    model: (body.model as string) || DEFAULT_MODEL,
  };

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "Sage - Video",
    },
    body: JSON.stringify(payload),
  });

  // Stream straight through — works for both SSE (stream:true) and JSON.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-cache",
    },
  });
}
