"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function OnboardingHeader({
  step,
  total,
  back,
  skip,
}: {
  step: number;
  total: number;
  back?: string;
  skip?: string;
}) {
  const pct = Math.min(100, Math.max(0, (step / total) * 100));
  return (
    <div className="flex items-center gap-3 mb-8">
      {back ? (
        <Link
          href={back}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-chamber-800/70 text-chamber-100 active:scale-95"
          aria-label="back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      ) : (
        <div className="w-9" />
      )}
      <div className="v2-progress flex-1">
        <div className="v2-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-chamber-400 lowercase whitespace-nowrap">
        {step}/{total}
      </div>
      {skip ? (
        <Link
          href={skip}
          className="text-sm text-chamber-300 hover:text-chamber-100 lowercase"
        >
          skip
        </Link>
      ) : (
        <div className="w-8" />
      )}
    </div>
  );
}
