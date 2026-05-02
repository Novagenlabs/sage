"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Settings, Loader2, Sparkles } from "lucide-react";
import { TabBar } from "@/components/v2/tab-bar";
import { SageMark } from "@/components/v2/sage-mark";

type Insight = {
  id: string;
  content: string;
  category: "pattern" | "preference" | "goal" | "behavior" | string;
  confidence: number;
  updatedAt: string;
};

const CATEGORY_META: Record<
  string,
  { label: string; hue: string; accent: string }
> = {
  pattern: {
    label: "patterns",
    hue: "bg-plum-500/30",
    accent: "text-plum-200",
  },
  preference: {
    label: "preferences",
    hue: "bg-bloom-400/30",
    accent: "text-bloom-200",
  },
  goal: {
    label: "goals",
    hue: "bg-ember-500/25",
    accent: "text-ember-200",
  },
  behavior: {
    label: "behaviours",
    hue: "bg-peach-500/30",
    accent: "text-peach-200",
  },
};

const CATEGORY_ORDER = ["pattern", "preference", "goal", "behavior"];

export default function PatternsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [tab, setTab] = useState<string>("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/v2/auth/signin?next=/v2/patterns");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/insights")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Insight[]) => setInsights(data))
      .catch(() => setInsights([]));
  }, [status]);

  if (status !== "authenticated" || insights === null) {
    return (
      <div className="min-h-[100dvh] bg-chamber-900 pb-28 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
        <TabBar />
      </div>
    );
  }

  // Build the tab list from categories that actually have insights
  const presentCategories = CATEGORY_ORDER.filter((c) =>
    insights.some((i) => i.category === c)
  );
  const tabs = ["all", ...presentCategories];

  const filtered =
    tab === "all" ? insights : insights.filter((i) => i.category === tab);

  return (
    <div className="min-h-[100dvh] bg-chamber-900 pb-28 lg:pb-16">
      <div className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] flex items-center justify-between mb-4 lg:max-w-4xl lg:mx-auto lg:pt-12 lg:px-8 lg:mb-8">
        <div className="bg-chamber-800/70 rounded-full p-0.5 flex overflow-x-auto max-w-[80%]">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs lowercase whitespace-nowrap ${
                tab === t ? "bg-chamber-50 text-chamber-900" : "text-chamber-300"
              }`}
            >
              {t === "all" ? "all" : CATEGORY_META[t]?.label ?? t}
            </button>
          ))}
        </div>
        <Link
          href="/v2/profile"
          className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {insights.length === 0 ? (
        <EmptyPatterns />
      ) : (
        <div className="px-6 space-y-3 lg:max-w-4xl lg:mx-auto lg:px-8 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {filtered.map((ins) => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-chamber-500 lowercase text-center py-12">
              nothing in this category yet.
            </p>
          )}
        </div>
      )}

      <TabBar />
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const meta =
    CATEGORY_META[insight.category] ?? {
      label: insight.category,
      hue: "bg-chamber-800/60",
      accent: "text-chamber-200",
    };
  const confidencePct = Math.round(insight.confidence * 100);

  return (
    <div
      className={`relative rounded-3xl p-5 min-h-[180px] flex flex-col ${meta.hue} overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-chamber-900/40 pointer-events-none" />
      <div className="relative z-10 flex-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-chamber-900/40 backdrop-blur px-3 py-1 text-xs text-chamber-200 lowercase mb-3">
          ↓ {meta.label}
        </div>
        <p
          className={`font-display text-2xl text-chamber-50 lowercase leading-snug tracking-tight ${meta.accent}`}
        >
          {insight.content}
        </p>
      </div>
      <div className="relative z-10 mt-3 flex items-center gap-2 text-xs text-chamber-300 lowercase">
        <div className="flex-1 h-1 rounded-full bg-chamber-900/40 overflow-hidden">
          <div
            className="h-full bg-chamber-50/80"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <span className="tabular-nums">{confidencePct}%</span>
      </div>
    </div>
  );
}

function EmptyPatterns() {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16 max-w-sm mx-auto">
      <div className="text-ember-400 mb-4">
        <SageMark size={56} animated />
      </div>
      <h2 className="font-display text-3xl tracking-tight lowercase mb-3">
        nothing yet
      </h2>
      <p className="text-chamber-300 leading-snug lowercase mb-6">
        sage notices patterns after you&apos;ve had a few sessions. the more you
        talk, the sharper this gets.
      </p>
      <Link
        href="/v2/chat/text?fresh=1"
        className="v2-btn v2-btn-primary"
      >
        <Sparkles className="h-4 w-4" />
        start a session
      </Link>
    </div>
  );
}
