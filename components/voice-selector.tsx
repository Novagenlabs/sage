"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { clsx } from "clsx";
import { AVAILABLE_VOICES } from "@/lib/voices";

interface VoiceSelectorProps {
  selectedVoiceKey: string;
  onSelect: (voiceKey: string) => void;
  disabled?: boolean;
}

// Each voice gets a warm-spectrum accent that stays within the app's palette
const VOICE_ACCENTS: Record<string, { color: string; glow: string }> = {
  sage:    { color: "#e07c38", glow: "rgba(224,124,56,0.55)"  }, // ember (brand)
  rachel:  { color: "#d4654a", glow: "rgba(212,101,74,0.50)"  }, // terra
  matilda: { color: "#c4956a", glow: "rgba(196,149,106,0.45)" }, // gold
  george:  { color: "#6b9a8d", glow: "rgba(107,154,141,0.45)" }, // sage-green
  lily:    { color: "#a78baa", glow: "rgba(167,139,170,0.45)" }, // muted lavender
  brian:   { color: "#7a9ebd", glow: "rgba(122,158,189,0.45)" }, // muted steel
  emily:   { color: "#d4956a", glow: "rgba(212,149,106,0.45)" }, // warm sand
  ify:     { color: "#6baa9a", glow: "rgba(107,170,154,0.50)" }, // jade
};

export function VoiceSelector({
  selectedVoiceKey,
  onSelect,
  disabled,
}: VoiceSelectorProps) {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const selectedVoice = AVAILABLE_VOICES.find((v) => v.key === selectedVoiceKey);
  const selectedAccent = VOICE_ACCENTS[selectedVoiceKey] || VOICE_ACCENTS.sage;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hint label */}
      <motion.p
        className="text-[11px] uppercase tracking-[0.2em] font-medium"
        style={{ color: "rgba(196,149,106,0.4)" }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
      >
        Choose a voice
      </motion.p>

      {/* Dock container */}
      <motion.div
        ref={dockRef}
        className="relative flex items-center gap-2 sm:gap-2.5 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5"
        style={{
          background: "rgba(8,8,12,0.6)",
          border: "1px solid rgba(196,149,106,0.12)",
          boxShadow:
            "0 1px 0 0 rgba(196,149,106,0.06) inset, 0 8px 32px -8px rgba(0,0,0,0.5)",
          backdropFilter: "blur(24px)",
        }}
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.1 }}
      >
        {AVAILABLE_VOICES.map((voice, index) => {
          const accent = VOICE_ACCENTS[voice.key] || VOICE_ACCENTS.sage;
          const isSelected = selectedVoiceKey === voice.key;
          const isHovered = hoveredKey === voice.key;

          return (
            <motion.div
              key={voice.key}
              className="relative"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 22,
                delay: 0.15 + index * 0.04,
              }}
            >
              {/* Glow layer behind selected orb */}
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                animate={{
                  boxShadow: isSelected
                    ? `0 0 24px 4px ${accent.glow}, 0 0 8px 1px ${accent.glow}`
                    : "0 0 0px 0px transparent",
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />

              <motion.button
                onClick={() => !disabled && onSelect(voice.key)}
                disabled={disabled}
                className={clsx(
                  "relative w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center cursor-pointer select-none overflow-hidden",
                  disabled && "opacity-40 cursor-not-allowed"
                )}
                style={{
                  background: isSelected
                    ? `radial-gradient(circle at 40% 35%, ${accent.color}22, rgba(8,8,12,0.95) 70%)`
                    : "rgba(20,20,26,0.9)",
                  border: `1.5px solid ${isSelected ? accent.color + "60" : "rgba(196,149,106,0.1)"}`,
                }}
                onMouseEnter={() => setHoveredKey(voice.key)}
                onMouseLeave={() => setHoveredKey(null)}
                whileHover={
                  !disabled && !shouldReduceMotion
                    ? {
                        scale: 1.12,
                        y: -5,
                        transition: { type: "spring", stiffness: 500, damping: 22 },
                      }
                    : undefined
                }
                whileTap={!disabled ? { scale: 0.93 } : undefined}
                animate={{
                  scale: isSelected ? 1.06 : 1,
                  borderColor: isSelected
                    ? accent.color + "70"
                    : isHovered
                    ? "rgba(196,149,106,0.25)"
                    : "rgba(196,149,106,0.1)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {/* Single serif letter */}
                <span
                  className="font-display text-base sm:text-lg font-semibold italic"
                  style={{
                    color: isSelected ? accent.color : "rgba(232,228,222,0.35)",
                    transition: "color 0.3s ease",
                    lineHeight: 1,
                  }}
                >
                  {voice.name[0]}
                </span>

                {/* Inner highlight arc for selected */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background: `conic-gradient(from 200deg, transparent 0%, ${accent.color}15 30%, transparent 60%)`,
                    }}
                    initial={{ opacity: 0, rotate: -30 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </motion.button>

              {/* Tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    className="absolute -top-11 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-50"
                    style={{
                      background: "rgba(12,12,18,0.92)",
                      border: "1px solid rgba(196,149,106,0.15)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    }}
                    initial={{ opacity: 0, y: 5, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.92 }}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                  >
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: accent.color }}
                    >
                      {voice.name}
                    </span>
                    <span className="text-[10px] text-white/30 ml-1.5">
                      {voice.description}
                    </span>
                    {/* Caret */}
                    <div
                      className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45"
                      style={{
                        background: "rgba(12,12,18,0.92)",
                        borderRight: "1px solid rgba(196,149,106,0.15)",
                        borderBottom: "1px solid rgba(196,149,106,0.15)",
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Selected voice label — uses the selected accent color */}
      <AnimatePresence mode="wait">
        {selectedVoice && (
          <motion.div
            key={selectedVoice.key}
            className="flex items-center gap-2.5"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Small colored dot */}
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: selectedAccent.color }}
              layoutId="voice-dot"
            />
            <span
              className="text-sm font-medium tracking-tight"
              style={{ color: selectedAccent.color }}
            >
              {selectedVoice.name}
            </span>
            <span className="text-xs" style={{ color: "rgba(196,149,106,0.35)" }}>
              {selectedVoice.description}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
