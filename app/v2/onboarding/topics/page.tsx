"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Loader2 } from "lucide-react";
import { OnboardingHeader } from "@/components/v2/progress-bar";

const PENDING_TOPICS_KEY = "sage-pending-topics";

const TOPICS = [
  "tune into my emotions",
  "stress less",
  "strengthen my relationships",
  "sleep better",
  "be more at ease socially",
  "manage anxiety",
  "decode my dreams",
  "make a hard decision",
  "find more clarity at work",
  "something else",
];

export default function TopicsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (t: string) => {
    setSelected((s) => {
      const ns = new Set(s);
      ns.has(t) ? ns.delete(t) : ns.add(t);
      return ns;
    });
  };

  const next = async () => {
    setSaving(true);
    const arr = Array.from(selected);
    try {
      if (status === "authenticated") {
        await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredTopics: arr }),
        });
      } else {
        localStorage.setItem(PENDING_TOPICS_KEY, JSON.stringify(arr));
      }
    } catch {
      try {
        localStorage.setItem(PENDING_TOPICS_KEY, JSON.stringify(arr));
      } catch {
        /* ignore */
      }
    } finally {
      router.push("/v2/onboarding/notifications");
    }
  };

  return (
    <div className="v2-screen bg-chamber-900">
      <OnboardingHeader
        step={3}
        total={5}
        back="/v2/onboarding/birthday"
        skip="/v2/onboarding/notifications"
      />

      <h1 className="v2-h1 mb-1">fire. what&apos;s the vision?</h1>
      <p className="v2-sub mb-8">i want to... (tap all that resonate)</p>

      {/* Decorative trio */}
      <div className="flex justify-center gap-3 mb-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <svg key={idx} viewBox="0 0 40 40" className="w-10 h-10 text-plum-400" fill="currentColor" aria-hidden>
            <ellipse cx="20" cy="22" rx="6" ry="14" />
            <circle cx="20" cy="6" r="3" />
            <line x1="20" y1="9" x2="20" y2="14" stroke="currentColor" strokeWidth="2" />
          </svg>
        ))}
      </div>

      <div className="space-y-2.5 flex-1 overflow-y-auto -mx-1 px-1">
        {TOPICS.map((t) => {
          const isOn = selected.has(t);
          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`w-full flex items-center justify-between px-5 py-3.5 rounded-full transition-all text-[0.95rem] ${
                isOn
                  ? "bg-ember-500 text-white"
                  : "bg-chamber-800/60 text-chamber-100 hover:bg-chamber-800"
              }`}
            >
              <span className="lowercase">{t}</span>
              {isOn && <Check className="h-4 w-4" strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      <button
        onClick={next}
        disabled={saving}
        className="v2-btn v2-btn-light w-full mt-4 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "next"}
      </button>
    </div>
  );
}
