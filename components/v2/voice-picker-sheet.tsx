"use client";

// Bottom-sheet voice picker for /chat/voice. Tap the pill → a full-screen
// sheet slides up that mirrors the /onboarding/voice composition (waveform
// + wheel + audio preview). Tap "done" or the X to commit and close.
//
// Reuses <V2VoicePicker> in defaultOpen mode so the wheel + preview behaviour
// stays identical between onboarding and mid-session.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { V2VoicePicker } from "@/components/v2/voice-picker";
import { AVAILABLE_VOICES } from "@/lib/voices";

interface Props {
  selectedKey: string;
  onSelect: (key: string) => void;
  /** Disable the trigger pill (e.g. while connecting). */
  disabled?: boolean;
}

export function VoicePickerSheet({ selectedKey, onSelect, disabled }: Props) {
  // Drive open state from this component so we can close on Escape, click
  // backdrop, or after the user taps "done".
  const [open, setOpen] = useState(false);
  const selectedVoice = AVAILABLE_VOICES.find((v) => v.key === selectedKey);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {/* Trigger pill — same visual language as the previous collapsed picker
          state, so the entry point feels familiar. */}
      <button
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-full bg-chamber-800/80 backdrop-blur px-4 py-2.5 text-sm text-chamber-100 lowercase border border-chamber-700 hover:bg-chamber-700 transition-colors disabled:opacity-50"
      >
        <span className="text-chamber-400 text-xs uppercase tracking-widest">
          voice
        </span>
        <span className="font-medium">
          {selectedVoice?.name.toLowerCase() ?? "—"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-chamber-400" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-chamber-900/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />

            {/* Sheet — anchored to bottom on mobile, centered modal on desktop.
                The flex-centered wrapper is what holds the desktop position;
                we can't use Tailwind translate classes on the motion.div
                itself because framer-motion's inline transform overrides
                them, leaving the sheet pinned to the top-left of the
                viewport's center. */}
            <div className="fixed inset-0 z-50 pointer-events-none lg:flex lg:items-center lg:justify-center">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="choose a voice"
              initial={{ y: "100%", opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 36 }}
              className="pointer-events-auto absolute inset-x-0 bottom-0 bg-chamber-900 border-t border-chamber-800 rounded-t-3xl px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4 lg:relative lg:inset-auto lg:w-[440px] lg:rounded-3xl lg:border lg:px-10 lg:pb-10"
            >
              {/* Drag handle (visual cue) */}
              <div
                aria-hidden
                className="mx-auto mb-3 h-1 w-12 rounded-full bg-chamber-700 lg:hidden"
              />

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-chamber-500 uppercase tracking-widest">
                  choose a voice
                </span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="close"
                  className="h-8 w-8 rounded-full bg-chamber-800 flex items-center justify-center text-chamber-300 hover:bg-chamber-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Waveform mark — same as /onboarding/voice */}
              <div className="flex justify-center mb-6">
                <svg
                  viewBox="0 0 120 80"
                  className="w-24 text-chamber-50"
                  fill="currentColor"
                  aria-hidden
                >
                  <ellipse cx="30" cy="40" rx="10" ry="28" />
                  <ellipse cx="58" cy="40" rx="8" ry="20" />
                  <ellipse cx="84" cy="40" rx="6" ry="14" />
                </svg>
              </div>

              {/* The wheel itself — defaultOpen + showHint=false matches the
                  onboarding screen's bare-wheel composition. */}
              <V2VoicePicker
                selectedKey={selectedKey}
                onSelect={onSelect}
                showHint={false}
                defaultOpen
                className="mb-6"
              />

              <button
                onClick={() => setOpen(false)}
                className="v2-btn v2-btn-light w-full"
              >
                done
              </button>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

