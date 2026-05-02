"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { OnboardingHeader } from "@/components/v2/progress-bar";

// localStorage fallback so the name survives an unauth visit and we can
// upsert it the moment the user signs in / signs up.
const PENDING_NAME_KEY = "sage-pending-name";

export default function NamePage() {
  const router = useRouter();
  const { status, update } = useSession();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const next = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (status === "authenticated") {
        const res = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (res.ok) {
          await update();
        } else {
          // Soft-fail: stash for retry next time the user authenticates.
          localStorage.setItem(PENDING_NAME_KEY, trimmed);
        }
      } else {
        // Unauthenticated — keep the choice locally so we can apply it later.
        localStorage.setItem(PENDING_NAME_KEY, trimmed);
      }
    } catch {
      localStorage.setItem(PENDING_NAME_KEY, trimmed);
    } finally {
      router.push("/v2/onboarding/birthday");
    }
  };

  return (
    <div className="v2-screen bg-chamber-900">
      <OnboardingHeader step={1} total={5} skip="/v2/onboarding/birthday" />

      <h1 className="v2-h1 mb-12">what should sage call you?</h1>

      {/* Pillowtalk-style sun-with-rays illustration in zest */}
      <div className="flex justify-center mb-14">
        <svg viewBox="0 0 200 130" className="w-44 text-zest-300" fill="currentColor" aria-hidden>
          <circle cx="100" cy="90" r="38" />
          {Array.from({ length: 9 }).map((_, idx) => {
            const angle = (idx / 9) * Math.PI - Math.PI / 9;
            const x = 100 + Math.cos(angle) * 60;
            const y = 90 - Math.sin(angle) * 60;
            return (
              <g key={idx}>
                <line x1="100" y1="90" x2={x} y2={y} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx={x} cy={y} r="6" />
              </g>
            );
          })}
          <circle cx="84" cy="86" r="4" fill="#08080c" />
          <path d="M104 88 Q 110 96 118 90" stroke="#08080c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      <div className="relative">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && next()}
          placeholder="your name"
          autoFocus
          disabled={saving}
          className="w-full bg-transparent text-3xl font-display lowercase text-chamber-50 placeholder:text-chamber-600 focus:outline-none border-b border-chamber-700 pb-3 disabled:opacity-60"
        />
      </div>

      <div className="flex-1" />

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!name.trim() || saving}
          className={`v2-fab ${(!name.trim() || saving) && "opacity-40 pointer-events-none"}`}
          aria-label="next"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowRight className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
