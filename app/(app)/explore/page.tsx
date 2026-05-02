"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import { TabBar } from "@/components/v2/tab-bar";

type ExplorePrompt = {
  title: string;
  est: string;
  prompt: string;
  color: string;
  accent: string;
};

type ExploreSection = {
  section: string;
  blurb: string;
  items: ExplorePrompt[];
};

// Static fallback rendered on first paint and when the API errors. Keeps the
// page from ever showing a blank/loading state.
const SEED: ExploreSection[] = [
  {
    section: "creativity",
    blurb:
      "your daily dose of inspiration. spark lateral thinking and marvel at the ideas in your mind.",
    items: [
      {
        title: "reverse thinking",
        est: "5 min",
        color: "bg-ember-500/15",
        accent: "from-ember-500/30",
        prompt:
          "I want to do a reverse-thinking exercise. Pick something I'm trying to achieve, then ask me how I would guarantee the opposite outcome.",
      },
      {
        title: "magical realism",
        est: "5 min",
        color: "bg-bloom-400/15",
        accent: "from-bloom-400/30",
        prompt:
          "Help me explore an idea I have through magical realism. Ask me what's mundane about my situation, then nudge me to imagine one impossible thing.",
      },
    ],
  },
  {
    section: "emotion",
    blurb: "tune into how you actually feel — name it, sit with it, move through it.",
    items: [
      {
        title: "what's underneath",
        est: "8 min",
        color: "bg-plum-400/15",
        accent: "from-plum-400/30",
        prompt:
          "I want to dig under a feeling I've been having. Ask me what I'm feeling on the surface, then guide me one layer at a time.",
      },
      {
        title: "dread inventory",
        est: "6 min",
        color: "bg-chamber-700/40",
        accent: "from-ember-500/20",
        prompt:
          "Help me do a dread inventory. Ask me what I've been avoiding lately — calls, decisions, conversations, feelings.",
      },
    ],
  },
  {
    section: "decision",
    blurb: "for the tough calls. lay it out, weigh it, hear yourself.",
    items: [
      {
        title: "the 10/10/10",
        est: "7 min",
        color: "bg-peach-500/20",
        accent: "from-ember-500/30",
        prompt:
          "Walk me through a 10/10/10 on a decision I'm sitting with. Ask me how I'll feel about this choice in 10 minutes, 10 months, and 10 years.",
      },
      {
        title: "fork in the road",
        est: "10 min",
        color: "bg-gold-400/15",
        accent: "from-gold-400/30",
        prompt:
          "I'm stuck between two paths. Help me lay them both out — what each one costs, what each one gives me, and what I'm avoiding by not choosing.",
      },
    ],
  },
];

// Bumped from v1 → v2 to evict prompts that were generated in Sage's voice
// rather than the user's voice. Old entries auto-discard on next visit.
const CACHE_KEY = "sage-explore-cache-v2";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

type Cache = { ts: number; sections: ExploreSection[] };

function readCache(): ExploreSection[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c: Cache = JSON.parse(raw);
    if (!c.ts || Date.now() - c.ts > CACHE_TTL_MS) return null;
    return c.sections;
  } catch {
    return null;
  }
}

function writeCache(sections: ExploreSection[]) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), sections } as Cache)
    );
  } catch {
    /* ignore quota */
  }
}

export default function ExplorePage() {
  const [sections, setSections] = useState<ExploreSection[]>(SEED);
  const [refreshing, setRefreshing] = useState(false);

  // First paint = instant render of seed (or cached personalised set if we
  // have one), then refresh from the server in the background.
  useEffect(() => {
    const cached = readCache();
    if (cached) setSections(cached);
    fetchFresh(cached === null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFresh = async (showSpinner: boolean) => {
    if (showSpinner) setRefreshing(true);
    try {
      const r = await fetch("/api/explore/prompts");
      if (!r.ok) return;
      const data = (await r.json()) as ExploreSection[];
      if (Array.isArray(data) && data.length > 0) {
        setSections(data);
        writeCache(data);
      }
    } catch {
      /* keep what we have */
    } finally {
      setRefreshing(false);
    }
  };

  const refreshNow = async () => {
    setRefreshing(true);
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      /* ignore */
    }
    await fetchFresh(true);
  };

  return (
    <div className="min-h-[100dvh] bg-chamber-900 pb-28 lg:pb-16">
      <div className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] lg:max-w-5xl lg:mx-auto lg:pt-12 lg:px-8">
        <div className="flex items-start justify-between mb-1">
          <h1 className="font-display text-4xl tracking-tight lowercase text-chamber-300 lg:text-5xl">
            explore
          </h1>
          <button
            onClick={refreshNow}
            disabled={refreshing}
            className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center text-chamber-300 disabled:opacity-50 hover:bg-chamber-700"
            aria-label="refresh prompts"
            title="refresh"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-sm text-chamber-500 mb-8 lowercase lg:text-base lg:mb-12">
          tap any card and sage will open the conversation with that frame.
          {refreshing && " · finding fresh prompts..."}
        </p>

        <div className="space-y-10 lg:space-y-14">
          {sections.map((s) => (
            <section key={s.section}>
              <h2 className="font-display text-2xl text-chamber-50 lowercase mb-1 lg:text-3xl">
                {s.section}
              </h2>
              <p className="text-sm text-chamber-400 mb-4 lowercase max-w-sm lg:mb-6">
                {s.blurb}
              </p>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                {s.items.map((it) => (
                  <Link
                    key={it.title}
                    href={{
                      pathname: "/chat/text",
                      query: {
                        prompt: it.prompt,
                        title: it.title,
                        fresh: "1",
                      },
                    }}
                    className={`relative rounded-2xl p-4 h-44 flex flex-col justify-between border border-chamber-800 ${it.color} overflow-hidden`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${it.accent} to-transparent opacity-60 pointer-events-none`}
                    />
                    <div className="relative z-10">
                      <p className="text-[10px] uppercase tracking-widest text-chamber-300 mb-2">
                        estimate · {it.est}
                      </p>
                      <h3 className="font-display text-2xl text-chamber-50 lowercase leading-none">
                        {it.title}
                      </h3>
                    </div>
                    <span className="relative z-10 ml-auto h-7 w-7 rounded-full bg-ember-500 text-white flex items-center justify-center">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <TabBar />
    </div>
  );
}
