"use client";

// Birthday onboarding step.
//
// The picker is three independent vertical scroll-wheels (month / day / year),
// each driven by CSS scroll-snap — same pattern as the voice picker. Whatever
// row sits in the centre band is the selected value. Tap a row to jump to it,
// or scroll/drag normally and let the wheel snap on settle.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { OnboardingHeader } from "@/components/v2/progress-bar";

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const YEARS = Array.from({ length: 80 }, (_, i) => String(2010 - i));

const ROW_H = 40;          // px — every row shares this height
const VISIBLE_ROWS = 5;    // 2 above + selected + 2 below
const WHEEL_H = ROW_H * VISIBLE_ROWS;
const PAD = (WHEEL_H - ROW_H) / 2; // pad top/bottom so first/last items can reach centre

const PENDING_BIRTHDAY_KEY = "sage-pending-birthday";

export default function BirthdayPage() {
  const router = useRouter();
  const { status } = useSession();
  const [month, setMonth] = useState(3);                    // april
  const [day, setDay] = useState(13);                       // 14th (0-indexed)
  const [year, setYear] = useState(YEARS.indexOf("1999"));  // 1999
  const [saving, setSaving] = useState(false);

  const next = async () => {
    setSaving(true);
    // Date constructor: month is 0-indexed, day is 1-indexed.
    const iso = new Date(
      Number(YEARS[year]),
      month,
      day + 1
    ).toISOString();
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
      router.push("/onboarding/topics");
    }
  };

  return (
    <div className="v2-screen bg-chamber-900 lg:!max-w-2xl lg:px-10 lg:pt-10">
      <OnboardingHeader
        step={2}
        total={5}
        back="/onboarding/name"
        skip="/onboarding/topics"
      />

      <h1 className="v2-h1 mb-2 lg:text-5xl lg:text-center">hey, welcome in.</h1>
      <p className="v2-h1 text-chamber-400 mb-12 lg:text-3xl lg:text-center">
        when do we get to celebrate you?
      </p>

      {/* Cake illustration */}
      <div className="flex justify-center mb-12 lg:mb-16">
        <svg viewBox="0 0 200 130" className="w-44 lg:w-56" aria-hidden>
          <rect x="40" y="80" width="120" height="14" rx="3" fill="#a36b3a" />
          <rect x="68" y="55" width="10" height="28" rx="2" fill="#f5b8d6" />
          <rect x="95" y="48" width="10" height="35" rx="2" fill="#f8f7f6" />
          <rect x="122" y="55" width="10" height="28" rx="2" fill="#cfe83a" />
          <path d="M73 50 Q 75 40 78 50 Q 76 55 73 50" fill="#ee8c5e" />
          <path d="M100 43 Q 102 33 105 43 Q 103 48 100 43" fill="#ee8c5e" />
          <path d="M127 50 Q 129 40 132 50 Q 130 55 127 50" fill="#ee8c5e" />
        </svg>
      </div>

      {/* Wheel picker — three columns sharing the centre band overlay. */}
      <div
        className="relative grid grid-cols-3 gap-1 mb-10 lg:mx-auto lg:max-w-md"
        style={{ height: WHEEL_H }}
      >
        {/* Centre selection band — sits above the wheels but below row hits. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 rounded-xl bg-chamber-800/60 border-y border-chamber-700 z-10"
          style={{ top: PAD, height: ROW_H }}
        />

        {/* Soft fades at the top + bottom so off-centre rows recede. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-10 z-20"
          style={{
            background:
              "linear-gradient(to bottom, rgb(8 8 12) 0%, rgba(8,8,12,0) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 z-20"
          style={{
            background:
              "linear-gradient(to top, rgb(8 8 12) 0%, rgba(8,8,12,0) 100%)",
          }}
        />

        <Wheel options={MONTHS} value={month} onChange={setMonth} />
        <Wheel options={DAYS} value={day} onChange={setDay} />
        <Wheel options={YEARS} value={year} onChange={setYear} />
      </div>

      <div className="flex-1" />

      <button
        onClick={next}
        disabled={saving}
        className="v2-btn v2-btn-light w-full disabled:opacity-50 lg:max-w-md lg:mx-auto"
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
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Suppress the scroll handler while we're programmatically jumping — it
  // would otherwise see the in-flight scrollTop and emit an onChange that
  // races the props change.
  const programmaticScroll = useRef(false);

  // Jump-scroll to centre the selected row whenever `value` changes from
  // outside (e.g. parent reset). On mount, this sets the initial scroll.
  useEffect(() => {
    if (!ref.current) return;
    if (Math.round(ref.current.scrollTop / ROW_H) === value) return;
    programmaticScroll.current = true;
    ref.current.scrollTo({ top: value * ROW_H, behavior: "instant" as ScrollBehavior });
    // Reset after the browser settles.
    setTimeout(() => {
      programmaticScroll.current = false;
    }, 50);
  }, [value]);

  const handleScroll = useCallback(() => {
    if (programmaticScroll.current) return;
    if (!ref.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (!ref.current) return;
      const nearest = Math.round(ref.current.scrollTop / ROW_H);
      const clamped = Math.max(0, Math.min(options.length - 1, nearest));
      if (clamped !== value) onChange(clamped);
    }, 90);
  }, [onChange, options.length, value]);

  const tap = (idx: number) => {
    if (idx === value) return;
    onChange(idx);
    if (ref.current) {
      programmaticScroll.current = true;
      ref.current.scrollTo({ top: idx * ROW_H, behavior: "smooth" });
      setTimeout(() => {
        programmaticScroll.current = false;
      }, 300);
    }
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="relative overflow-y-auto no-scrollbar"
      style={{
        height: WHEEL_H,
        scrollSnapType: "y mandatory",
        paddingTop: PAD,
        paddingBottom: PAD,
      }}
    >
      {options.map((opt, idx) => {
        const isCenter = idx === value;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => tap(idx)}
            style={{
              height: ROW_H,
              scrollSnapAlign: "center",
            }}
            className={`w-full flex items-center justify-center transition-all ${
              isCenter
                ? "text-chamber-50 text-xl font-medium"
                : "text-chamber-400 text-base hover:text-chamber-200"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
