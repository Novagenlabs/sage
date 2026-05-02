"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { OnboardingHeader } from "@/components/v2/progress-bar";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 80 }, (_, i) => 2010 - i);

const ROW_H = 36; // px — every cell shares this so columns align
const VISIBLE = 5; // 2 above + selected + 2 below

const PENDING_BIRTHDAY_KEY = "sage-pending-birthday";

export default function BirthdayPage() {
  const router = useRouter();
  const { status } = useSession();
  const [month, setMonth] = useState(3);
  const [day, setDay] = useState(13); // 0-indexed → 14
  const [year, setYear] = useState(YEARS.indexOf(1999));
  const [saving, setSaving] = useState(false);

  const next = async () => {
    setSaving(true);
    // ISO date — month is 1-indexed in the JS Date constructor
    const iso = new Date(YEARS[year], month, day + 1).toISOString();
    try {
      if (status === "authenticated") {
        await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ birthday: iso }),
        });
      } else {
        localStorage.setItem(PENDING_BIRTHDAY_KEY, iso);
      }
    } catch {
      try {
        localStorage.setItem(PENDING_BIRTHDAY_KEY, iso);
      } catch {
        /* ignore */
      }
    } finally {
      router.push("/v2/onboarding/topics");
    }
  };

  return (
    <div className="v2-screen bg-chamber-900">
      <OnboardingHeader
        step={2}
        total={5}
        back="/v2/onboarding/name"
        skip="/v2/onboarding/topics"
      />

      <h1 className="v2-h1 mb-2">hey, welcome in.</h1>
      <p className="v2-h1 text-chamber-400 mb-12">
        when do we get to celebrate you?
      </p>

      {/* Cake illustration */}
      <div className="flex justify-center mb-12">
        <svg viewBox="0 0 200 130" className="w-44" aria-hidden>
          <rect x="40" y="80" width="120" height="14" rx="3" fill="#a36b3a" />
          <rect x="68" y="55" width="10" height="28" rx="2" fill="#f5b8d6" />
          <rect x="95" y="48" width="10" height="35" rx="2" fill="#f8f7f6" />
          <rect x="122" y="55" width="10" height="28" rx="2" fill="#cfe83a" />
          <path d="M73 50 Q 75 40 78 50 Q 76 55 73 50" fill="#ee8c5e" />
          <path d="M100 43 Q 102 33 105 43 Q 103 48 100 43" fill="#ee8c5e" />
          <path d="M127 50 Q 129 40 132 50 Q 130 55 127 50" fill="#ee8c5e" />
        </svg>
      </div>

      {/* Wheel picker — three columns sharing a common baseline */}
      <div
        className="relative grid grid-cols-3 gap-1 mb-8"
        style={{ height: ROW_H * VISIBLE }}
      >
        {/* Center selection band */}
        <div
          className="pointer-events-none absolute left-0 right-0 rounded-xl bg-chamber-800/60 border-y border-chamber-700"
          style={{
            top: ROW_H * Math.floor(VISIBLE / 2),
            height: ROW_H,
          }}
        />

        <Wheel options={MONTHS} value={month} onChange={setMonth} />
        <Wheel options={DAYS.map(String)} value={day} onChange={setDay} />
        <Wheel options={YEARS.map(String)} value={year} onChange={setYear} />
      </div>

      <div className="flex-1" />

      <button
        onClick={next}
        disabled={saving}
        className="v2-btn v2-btn-light w-full disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "next"}
      </button>
    </div>
  );
}

function Wheel({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number;
  onChange: (i: number) => void;
}) {
  // Render a fixed window of VISIBLE rows centered on `value`.
  // Each cell has the same height so all three columns line up perfectly.
  const half = Math.floor(VISIBLE / 2);
  const cells = Array.from({ length: VISIBLE }, (_, k) => {
    const idx = value - half + k;
    return { idx, label: options[idx] ?? "" };
  });

  const clamp = (i: number) => Math.max(0, Math.min(options.length - 1, i));

  return (
    <div className="relative flex flex-col items-stretch select-none">
      {cells.map((c, k) => {
        const distance = Math.abs(k - half);
        const isCenter = distance === 0;
        const opacity = isCenter ? 1 : distance === 1 ? 0.55 : 0.25;
        const sizeClass = isCenter ? "text-xl font-medium" : "text-sm";
        const colorClass = isCenter ? "text-chamber-50" : "text-chamber-300";
        const inBounds = c.idx >= 0 && c.idx < options.length;
        return (
          <button
            key={k}
            disabled={!inBounds || isCenter}
            onClick={() => inBounds && onChange(clamp(c.idx))}
            style={{ height: ROW_H, opacity }}
            className={`flex items-center justify-center ${sizeClass} ${colorClass} transition-opacity`}
          >
            {c.label}
          </button>
        );
      })}

      {/* Tiny chevron hint on the side, only on the center column once */}
      {options === options && (
        <div className="absolute right-1 top-0 bottom-0 hidden" />
      )}
      {/* Up/down nudges below for accessibility */}
      <div className="absolute -bottom-7 left-0 right-0 flex justify-center gap-2 text-chamber-600">
        <button
          onClick={() => onChange(clamp(value - 1))}
          aria-label="previous"
          className="h-5 w-5 flex items-center justify-center"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          onClick={() => onChange(clamp(value + 1))}
          aria-label="next"
          className="h-5 w-5 flex items-center justify-center"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
