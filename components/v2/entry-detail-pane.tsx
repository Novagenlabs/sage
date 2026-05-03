"use client";

// Shared entry-detail renderer used by:
//   - /entries/[id] (full-screen on mobile)
//   - /entries (right pane on desktop)
//
// Fetches the conversation by id and shows summary + insights only.
// Transcripts are not stored, hence no transcript view.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Share2 } from "lucide-react";
import { RecommendationCard } from "@/components/v2/recommendation-card";
import type { RecommendationPayload } from "@/lib/recommendations/types";

type Insight = {
  id: string;
  content: string;
  type: string;
  createdAt: string;
};

type RawRecommendation = {
  id: string;
  reason: string;
  feedback: string | null;
  resource: {
    id: string;
    type: string;
    title: string;
    author: string | null;
    url: string;
    blurb: string;
    audioUrl: string | null;
  };
};

type Convo = {
  id: string;
  title: string | null;
  summary: string | null;
  phase: string;
  isActive: boolean;
  // color + moods are optional — legacy conversations created before the
  // schema bump won't have these fields populated.
  color?: string | null;
  moods?: string[] | null;
  createdAt: string;
  insights: Insight[];
  // Most recent recommendation tied to this session (or empty array).
  recommendations?: RawRecommendation[];
};

function toRecommendationPayload(
  raw: RawRecommendation
): RecommendationPayload {
  return {
    recommendationId: raw.id,
    resource: {
      id: raw.resource.id,
      type: raw.resource.type as RecommendationPayload["resource"]["type"],
      title: raw.resource.title,
      author: raw.resource.author,
      url: raw.resource.url,
      blurb: raw.resource.blurb,
      audioUrl: raw.resource.audioUrl,
    },
    reason: raw.reason,
    feedback:
      raw.feedback === "helpful" || raw.feedback === "not_for_me"
        ? raw.feedback
        : null,
  };
}

const COLOR_HEX: Record<string, string> = {
  ember: "#e07c38",
  peach: "#f7b08a",
  bloom: "#f5b8d6",
  plum: "#b48af2",
  sage: "#6b9a8d",
  gold: "#c4956a",
};

function fmtTimestamp(s: string) {
  return new Date(s)
    .toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .toLowerCase();
}

interface Props {
  id: string;
  /** Called after a successful delete; parents can update lists or navigate. */
  onDeleted?: () => void;
  /** Render mode — affects header and outer chrome. */
  variant?: "page" | "pane";
}

export function EntryDetailPane({ id, onDeleted, variant = "pane" }: Props) {
  const router = useRouter();
  const [convo, setConvo] = useState<Convo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setConvo(null);
    setErr(null);
    fetch(`/api/conversations/${id}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.replace(`/auth/signin?next=/entries/${id}`);
          return null;
        }
        if (!r.ok) throw new Error("could not load entry");
        return r.json();
      })
      .then((data) => data && setConvo(data))
      .catch((e: Error) => setErr(e.message));
  }, [id, router]);

  const onDelete = async () => {
    if (!confirm("delete this entry forever?")) return;
    setDeleting(true);
    const r = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (r.ok) {
      if (onDeleted) onDeleted();
      else router.replace("/entries");
    } else {
      setDeleting(false);
    }
  };

  const wrapperClass =
    variant === "page"
      ? "v2-screen bg-chamber-900 px-0"
      : "rounded-3xl border border-chamber-800 bg-chamber-800/30 backdrop-blur-md p-8";

  if (err) {
    return <div className={wrapperClass}>
      <p className="text-sm text-red-400 lowercase px-6">{err}</p>
    </div>;
  }

  if (!convo) {
    return (
      <div className={`${wrapperClass} ${variant === "pane" ? "min-h-[40vh]" : ""} flex items-center justify-center`}>
        <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
      </div>
    );
  }

  const hasContent = !!convo.summary || convo.insights.length > 0;

  return (
    <div className={wrapperClass}>
      <div className={variant === "page" ? "px-6 mb-2" : ""}>
        <div className="flex items-center gap-3 mb-2">
          {convo.color && COLOR_HEX[convo.color] && (
            <span
              className="h-4 w-4 rounded-full flex-shrink-0"
              style={{ background: COLOR_HEX[convo.color] }}
              aria-label={`color: ${convo.color}`}
            />
          )}
          <h1 className="font-display text-3xl tracking-tight lowercase flex-1">
            {convo.title || "untitled entry"}
          </h1>
          <button className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center text-chamber-300 hover:bg-chamber-700">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-chamber-500 mt-1 lowercase">
          {fmtTimestamp(convo.createdAt)}
        </p>
        {(convo.moods?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {convo.moods!.map((m) => (
              <span
                key={m}
                className="rounded-full bg-chamber-800/80 px-2.5 py-1 text-[11px] text-chamber-200 lowercase"
              >
                {m}
              </span>
            ))}
          </div>
        )}
        <p className="text-[11px] text-chamber-600 mt-2 lowercase italic">
          sage doesn&apos;t keep your words — only the patterns.
        </p>
      </div>

      <div className={variant === "page" ? "flex-1 overflow-y-auto px-6 pt-4 pb-4" : "pt-4"}>
        {!hasContent ? (
          <div className="pt-12 text-center">
            <p className="text-sm text-chamber-500 lowercase">
              {convo.isActive
                ? "this session is still in progress. finish it to see the summary."
                : "no summary yet — it's being written. check back in a moment."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {convo.summary && (
              <div className="v2-card">
                <p className="text-xs uppercase tracking-widest text-ember-400 mb-2">
                  summary
                </p>
                <p className="text-sm text-chamber-200 leading-relaxed whitespace-pre-wrap">
                  {convo.summary}
                </p>
              </div>
            )}
            {convo.recommendations && convo.recommendations.length > 0 && (
              <RecommendationCard
                recommendation={toRecommendationPayload(
                  convo.recommendations[0]
                )}
                variant="entry"
              />
            )}
            {convo.insights.map((ins) => (
              <div key={ins.id} className="v2-card">
                <p className="text-xs uppercase tracking-widest text-bloom-400 mb-2">
                  {ins.type}
                </p>
                <p className="text-sm text-chamber-200 leading-relaxed">
                  {ins.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={variant === "page" ? "px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" : "pt-4 mt-4 border-t border-chamber-800"}>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="w-full flex items-center justify-center gap-2 py-3 text-chamber-500 text-sm lowercase hover:text-red-400 disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          delete entry
        </button>
      </div>
    </div>
  );
}
