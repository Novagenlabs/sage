"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Loader2 } from "lucide-react";

const MOODS = {
  charged: ["confused", "scared", "irritated", "frustrated", "panicked", "frantic", "furious", "stressed", "anxious", "shocked", "worried", "jealous", "peeved", "concerned", "apprehensive", "embarrassed"],
  light: ["hopeful", "curious", "easy", "playful", "warm", "fond", "alive", "calm", "open", "okay", "settled", "amused", "glowing", "loose"],
  heavy: ["heavy", "numb", "tender", "small", "tired", "lonely", "blue", "lost", "dim"],
};

const COLORS = {
  charged: { dot: "bg-peach-500", text: "text-peach-400", chipOn: "bg-peach-500 text-chamber-900" },
  light: { dot: "bg-ember-400", text: "text-ember-400", chipOn: "bg-ember-500 text-white" },
  heavy: { dot: "bg-plum-400", text: "text-plum-400", chipOn: "bg-plum-400 text-chamber-900" },
};

type Cat = keyof typeof MOODS;

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const conversationId = params.get("id");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!conversationId);

  // Hydrate from existing conversation moods if we have an id.
  useEffect(() => {
    if (!conversationId) return;
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { moods?: string[] } | null) => {
        if (c?.moods) setSelected(new Set(c.moods));
      })
      .finally(() => setLoading(false));
  }, [conversationId]);

  const toggle = (m: string) => {
    setSelected((s) => {
      const ns = new Set(s);
      ns.has(m) ? ns.delete(m) : ns.add(m);
      return ns;
    });
  };

  const done = async () => {
    if (!conversationId) {
      router.push("/v2/home");
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moods: Array.from(selected) }),
      });
    } catch {
      /* best-effort */
    } finally {
      router.push(`/v2/entries/${conversationId}`);
    }
  };

  if (loading) {
    return (
      <div className="v2-screen bg-chamber-900 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
      </div>
    );
  }

  return (
    <div className="v2-screen bg-chamber-900">
      <Link
        href="/v2/home"
        className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center mb-4"
      >
        <X className="h-4 w-4" />
      </Link>

      <h1 className="v2-h1 mb-1">you&apos;re feeling</h1>
      <p className="text-xs text-chamber-400 mb-5 leading-relaxed">
        when you understand your emotions — what triggers them, how you
        respond — you can make smarter choices.
      </p>

      {selected.size > 0 && (
        <div className="mb-5">
          <p className="text-xs text-chamber-400 lowercase mb-2">selected</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(selected).map((m) => (
              <button
                key={m}
                onClick={() => toggle(m)}
                className="inline-flex items-center gap-1.5 rounded-full bg-chamber-800 px-3 py-1.5 text-sm text-chamber-100"
              >
                {m} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-5 pb-24">
        {(Object.keys(MOODS) as Cat[]).map((cat) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2 w-2 rounded-full ${COLORS[cat].dot}`} />
              <span className={`text-sm font-medium lowercase ${COLORS[cat].text}`}>
                {cat}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MOODS[cat].map((m) => {
                const isOn = selected.has(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggle(m)}
                    className={`px-2 py-2 rounded-full text-xs lowercase transition ${
                      isOn ? COLORS[cat].chipOn : "bg-chamber-800/60 text-chamber-200"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 bg-gradient-to-t from-chamber-900 via-chamber-900 to-transparent">
        <button
          onClick={done}
          disabled={saving}
          className="v2-btn v2-btn-light w-full disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "done"}
        </button>
      </div>
    </div>
  );
}

export default function MoodPage() {
  return (
    <Suspense
      fallback={
        <div className="v2-screen bg-chamber-900 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
        </div>
      }
    >
      <Inner />
    </Suspense>
  );
}
