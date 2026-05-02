"use client";

// Post-session annotation: lets the user paint the entry a colour and
// (optionally) tag the moods + people involved. Reads ?id=<conversationId>
// from the URL — this is the conversation that just ended.

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, Users } from "lucide-react";

const COLORS = [
  { id: "ember", c: "#e07c38" },
  { id: "peach", c: "#f7b08a" },
  { id: "bloom", c: "#f5b8d6" },
  { id: "plum", c: "#b48af2" },
  { id: "sage", c: "#6b9a8d" },
  { id: "gold", c: "#c4956a" },
];

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const conversationId = params.get("id");

  const [color, setColor] = useState("plum");
  const [saving, setSaving] = useState(false);

  // If we landed without a conversation id, fall back to the most recent one.
  useEffect(() => {
    if (conversationId) return;
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : []))
      .then((convos: { id: string }[]) => {
        if (convos.length > 0) {
          router.replace(`/v2/entries/active?id=${convos[0].id}`, {
            scroll: false,
          });
        }
      });
  }, [conversationId, router]);

  const done = async () => {
    if (!conversationId) {
      router.push("/v2/entries");
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
    } catch {
      /* best-effort */
    } finally {
      router.push(`/v2/entries/${conversationId}`);
    }
  };

  return (
    <div className="v2-screen bg-chamber-900 px-0">
      <div className="px-6 mb-4 flex items-center justify-between">
        <Link
          href="/v2/entries"
          className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <p className="text-xs text-chamber-400 lowercase">paint your entry</p>
        <span className="w-9" />
      </div>

      <h1 className="v2-h1 px-6 mb-8">what colour was this?</h1>

      <div
        className="mx-6 rounded-3xl flex-1 flex items-end p-4 transition-all"
        style={{
          background: `linear-gradient(180deg, ${
            COLORS.find((x) => x.id === color)?.c
          } 0%, #08080c 95%)`,
        }}
      >
        <motion.div
          key={color}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="ml-auto h-7 w-7 rounded-full bg-white/30 backdrop-blur border border-white/40"
        />
      </div>

      <div className="flex gap-3 px-6 py-6 overflow-x-auto">
        {COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => setColor(c.id)}
            className={`h-10 w-10 rounded-full flex-shrink-0 ${
              c.id === color
                ? "ring-2 ring-chamber-50 ring-offset-2 ring-offset-chamber-900"
                : ""
            }`}
            style={{ background: c.c }}
            aria-label={c.id}
          />
        ))}
      </div>

      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex items-center justify-between gap-3">
        <Link
          href={`/v2/mood${conversationId ? `?id=${conversationId}` : ""}`}
          className="flex items-center gap-2 rounded-full bg-chamber-800/70 px-4 py-3 text-sm text-chamber-100"
        >
          <Users className="h-4 w-4" />
          tag moods
        </Link>
        <button
          onClick={done}
          disabled={saving}
          className="v2-btn v2-btn-light flex-1 justify-center disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              done
              <span
                className="h-3 w-3 rounded-full ml-1"
                style={{ background: COLORS.find((x) => x.id === color)?.c }}
              />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ActiveSession() {
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
