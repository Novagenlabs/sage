"use client";

import { clsx } from "clsx";
import type { DialoguePhase } from "@/lib/prompts";

interface PhaseIndicatorProps {
  currentPhase: DialoguePhase;
}

const PHASES: { id: DialoguePhase; label: string; description: string }[] = [
  { id: "opening", label: "Opening", description: "Understanding the problem" },
  { id: "exploring", label: "Exploring", description: "Gathering context" },
  { id: "examining", label: "Examining", description: "Probing assumptions" },
  { id: "challenging", label: "Challenging", description: "Testing beliefs" },
  { id: "expanding", label: "Expanding", description: "New perspectives" },
  { id: "synthesizing", label: "Synthesizing", description: "Connecting insights" },
  { id: "concluding", label: "Concluding", description: "Summarizing discoveries" },
];

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);
  const current = PHASES[currentIndex];

  return (
    <div className="flex items-center gap-2">
      {/* Progress dots */}
      <div className="flex items-center gap-1">
        {PHASES.map((phase, index) => (
          <div
            key={phase.id}
            className={clsx(
              "w-2 h-2 rounded-full transition-colors",
              index < currentIndex
                ? "bg-purple-500"
                : index === currentIndex
                  ? "bg-purple-400 ring-2 ring-purple-400/30"
                  : "bg-gray-700"
            )}
            title={phase.label}
          />
        ))}
      </div>

      {/* Current phase label */}
      <div className="text-sm">
        <span className="text-purple-400 font-medium">{current?.label}</span>
        <span className="text-gray-500 ml-2 hidden sm:inline">{current?.description}</span>
      </div>
    </div>
  );
}
