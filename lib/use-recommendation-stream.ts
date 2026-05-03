"use client";

// Client hook that POSTs to /api/recommendations/stream and parses the SSE
// events into a small phase machine. Used by the chat surfaces (text, voice,
// video) to render the post-session recommendation card without coupling
// each surface to the SSE wire format.
//
// Mirrors the SSE-parsing loop in nansen_comp/components/video-chat.tsx so
// the two stay easy to compare.

import { useCallback, useRef, useState } from "react";
import type {
  RecommendationEvent,
  RecommendationPayload,
} from "@/lib/recommendations/types";

export type StreamPhase = "idle" | "thinking" | "card" | "done" | "error";

export interface StartArgs {
  conversationId: string;
  latestSummary?: string;
  latestInsights?: Array<{ type: string; content: string }>;
  /** Caller-provided abort signal — chat pages cancel mid-flight on unmount. */
  signal?: AbortSignal;
}

export function useRecommendationStream() {
  const [phase, setPhase] = useState<StreamPhase>("idle");
  const [recommendation, setRecommendation] =
    useState<RecommendationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guard against double-start on a fast re-render — the chat ending state
  // only runs the stream once per session.
  const inFlight = useRef(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setRecommendation(null);
    setError(null);
    inFlight.current = false;
  }, []);

  const start = useCallback(async (args: StartArgs) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase("thinking");
    setRecommendation(null);
    setError(null);

    try {
      const res = await fetch("/api/recommendations/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: args.conversationId,
          latestSummary: args.latestSummary,
          latestInsights: args.latestInsights,
        }),
        signal: args.signal,
      });

      if (!res.ok || !res.body) {
        setPhase("error");
        setError(`stream failed (${res.status})`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // SSE parser — walks the buffer line-by-line, dispatching whenever it
      // hits a "data: …" line (server emits exactly one event per such line).
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const raw = trimmed.slice(5).trim();
          if (!raw) continue;
          let event: RecommendationEvent;
          try {
            event = JSON.parse(raw) as RecommendationEvent;
          } catch {
            continue;
          }
          if (event.type === "thinking") {
            setPhase("thinking");
          } else if (event.type === "data_card") {
            setRecommendation(event.data.recommendation);
            setPhase("card");
          } else if (event.type === "done") {
            setPhase((p) => (p === "card" ? "card" : "done"));
          } else if (event.type === "error") {
            setError(event.message);
            setPhase("error");
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        // Caller unmounted; keep phase as-is.
        return;
      }
      console.error("[useRecommendationStream] error:", err);
      setError(err instanceof Error ? err.message : "stream error");
      setPhase("error");
    } finally {
      inFlight.current = false;
    }
  }, []);

  return { phase, recommendation, error, start, reset };
}
