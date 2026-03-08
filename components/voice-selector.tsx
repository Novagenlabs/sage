"use client";

import { useState } from "react";
import { ChevronDown, Volume2 } from "lucide-react";
import { clsx } from "clsx";
import { AVAILABLE_VOICES, type Voice } from "@/lib/voices";

interface VoiceSelectorProps {
  selectedVoiceKey: string;
  onSelect: (voiceKey: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({
  selectedVoiceKey,
  onSelect,
  disabled,
}: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedVoice = AVAILABLE_VOICES.find((v) => v.key === selectedVoiceKey);

  // Group voices by gender
  const femaleVoices = AVAILABLE_VOICES.filter((v) => v.gender === "female");
  const maleVoices = AVAILABLE_VOICES.filter((v) => v.gender === "male");

  return (
    <div className="relative w-full">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          "flex items-center gap-2 px-4 py-3 rounded-xl transition-colors w-full",
          "bg-white/5 hover:bg-white/10 border border-white/10",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Volume2 className="w-4 h-4 text-amber-400/60" />
        <div className="flex-1 text-left">
          <span className="text-sm text-white/80">
            {selectedVoice?.name || "Select voice"}
          </span>
          {selectedVoice && (
            <span className="text-xs text-white/40 ml-2">
              {selectedVoice.description}
            </span>
          )}
        </div>
        <ChevronDown
          className={clsx(
            "w-4 h-4 text-white/40 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-stone-900 border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden max-h-80 overflow-y-auto">
            {/* Female voices */}
            <div className="px-3 py-2 text-xs font-medium text-white/40 uppercase tracking-wide bg-white/5">
              Female
            </div>
            {femaleVoices.map((voice) => (
              <VoiceOption
                key={voice.key}
                voice={voice}
                isSelected={selectedVoiceKey === voice.key}
                onSelect={() => {
                  onSelect(voice.key);
                  setIsOpen(false);
                }}
              />
            ))}

            {/* Male voices */}
            <div className="px-3 py-2 text-xs font-medium text-white/40 uppercase tracking-wide bg-white/5">
              Male
            </div>
            {maleVoices.map((voice) => (
              <VoiceOption
                key={voice.key}
                voice={voice}
                isSelected={selectedVoiceKey === voice.key}
                onSelect={() => {
                  onSelect(voice.key);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function VoiceOption({
  voice,
  isSelected,
  onSelect,
}: {
  voice: Voice;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left",
        isSelected && "bg-amber-900/20"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/90">{voice.name}</span>
          {isSelected && (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
        </div>
        <p className="text-xs text-white/50 mt-0.5">{voice.description}</p>
      </div>
    </button>
  );
}
