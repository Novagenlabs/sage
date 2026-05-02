"use client";

import Link from "next/link";
import { useState } from "react";
import { OnboardingHeader } from "@/components/v2/progress-bar";
import { V2VoicePicker } from "@/components/v2/voice-picker";
import { DEFAULT_VOICE_KEY } from "@/lib/voices";

const VOICE_KEY_STORAGE = "sage-v2-voice-key";

export default function VoicePage() {
  const [selectedKey, setSelectedKey] = useState(DEFAULT_VOICE_KEY);

  const handleSelect = (key: string) => {
    setSelectedKey(key);
    try {
      localStorage.setItem(VOICE_KEY_STORAGE, key);
    } catch {
      /* ignore quota */
    }
  };

  return (
    <div className="v2-screen bg-chamber-900">
      <OnboardingHeader step={5} total={5} back="/onboarding/notifications" />

      <h1 className="v2-h1 mb-2">choose a voice</h1>
      <p className="v2-sub mb-12">you can change this later.</p>

      {/* Waveform mark */}
      <div className="flex justify-center mb-12">
        <svg viewBox="0 0 120 80" className="w-32 text-chamber-50" fill="currentColor">
          <ellipse cx="30" cy="40" rx="10" ry="28" />
          <ellipse cx="58" cy="40" rx="8" ry="20" />
          <ellipse cx="84" cy="40" rx="6" ry="14" />
        </svg>
      </div>

      <V2VoicePicker
        selectedKey={selectedKey}
        onSelect={handleSelect}
        showHint={false}
        defaultOpen
        className="mb-10"
      />

      <div className="flex-1" />

      <Link href="/onboarding/loading" className="v2-btn v2-btn-light w-full">
        continue
      </Link>
    </div>
  );
}
