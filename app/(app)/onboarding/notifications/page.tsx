"use client";

import Link from "next/link";
import { useState } from "react";
import { Sun, Cog, Moon } from "lucide-react";
import { OnboardingHeader } from "@/components/v2/progress-bar";
import { clsx } from "clsx";

export default function NotificationsPage() {
  const [enabled, setEnabled] = useState({ morning: false, day: true, evening: true });

  return (
    <div className="v2-screen bg-chamber-900">
      <OnboardingHeader step={4} total={5} back="/onboarding/topics" skip="/onboarding/voice" />

      <h1 className="v2-h1 mb-1">small steps. big results.</h1>
      <p className="v2-sub mb-12">
        what time feels right for your me-time?
      </p>

      <div className="grid grid-cols-3 gap-2 px-2 mb-12">
        <Slot icon={<Sun className="h-5 w-5 text-ember-400" />} label="morning" time="8:03 AM" on={enabled.morning} onToggle={() => setEnabled((s) => ({ ...s, morning: !s.morning }))} />
        <div className="border-l border-chamber-800 -mx-1" />
        <Slot icon={<Cog className="h-5 w-5 text-ember-400" />} label="day" time="3:41 PM" on={enabled.day} onToggle={() => setEnabled((s) => ({ ...s, day: !s.day }))} />
        <div className="border-l border-chamber-800 -mx-1" />
        <Slot icon={<Moon className="h-5 w-5 text-ember-400" />} label="evening" time="8:22 PM" on={enabled.evening} onToggle={() => setEnabled((s) => ({ ...s, evening: !s.evening }))} />
      </div>

      <div className="flex-1" />

      <div className="space-y-3">
        <Link href="/onboarding/voice" className="v2-btn v2-btn-outline w-full">
          set up later
        </Link>
        <Link href="/onboarding/voice" className="v2-btn v2-btn-light w-full">
          turn on motivation
        </Link>
      </div>
    </div>
  );
}

function Slot({
  icon,
  label,
  time,
  on,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {icon}
      <div className="text-sm font-medium text-chamber-100 lowercase">{label}</div>
      <div className="text-xs text-chamber-300 bg-chamber-800/70 rounded-full px-3 py-1 mt-1">{time}</div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        className={clsx(
          "mt-3 inline-flex items-center w-[52px] h-[32px] rounded-full transition-colors duration-200 p-[3px]",
          on ? "bg-ember-500" : "bg-chamber-700"
        )}
      >
        <span
          className={clsx(
            "h-[26px] w-[26px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
            on ? "translate-x-[20px]" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
