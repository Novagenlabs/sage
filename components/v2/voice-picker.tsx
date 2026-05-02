"use client";

// v2 voice picker.
//
// Default state: a single pill showing the current voice ("voice · ify"). The
// orb behind it stays the focal point.
//
// Tap the pill: expands into a vertical scroll-wheel. The item snapped into
// the centre band is the active selection. Tapping any item also selects it
// directly. Tap "done" or the close handle to collapse back to the pill.

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { AVAILABLE_VOICES } from "@/lib/voices";

const ITEM_H = 44; // px — every wheel row is the same height
const VISIBLE_ROWS = 5; // 2 above, 1 centre, 2 below
const WHEEL_H = ITEM_H * VISIBLE_ROWS; // 220
const PAD = (WHEEL_H - ITEM_H) / 2; // 88 — lets the first/last items reach centre

export function V2VoicePicker({
  selectedKey,
  onSelect,
  disabled = false,
  showHint = true,
  defaultOpen = false,
  className = "",
}: {
  selectedKey: string;
  onSelect: (key: string) => void;
  disabled?: boolean;
  /** Hide the "choose a voice" hint when the picker is in a context that
   *  already implies its purpose (e.g. the onboarding screen). */
  showHint?: boolean;
  /** Open the wheel immediately and hide the "done" affordance. Used on
   *  surfaces dedicated to picking a voice (onboarding step). */
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const wheelRef = useRef<HTMLDivElement>(null);
  const scrollSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const idx = Math.max(
    0,
    AVAILABLE_VOICES.findIndex((v) => v.key === selectedKey)
  );
  const selectedVoice = AVAILABLE_VOICES[idx];

  // When the wheel opens, jump-scroll so the selected voice is centred.
  useEffect(() => {
    if (!open || !wheelRef.current) return;
    wheelRef.current.scrollTo({ top: idx * ITEM_H, behavior: "instant" as ScrollBehavior });
  }, [open, idx]);

  // Debounced scroll-end handler: snap to the row closest to the centre
  // band and emit onSelect.
  const handleScroll = useCallback(() => {
    if (!wheelRef.current || disabled) return;
    if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
    scrollSettleTimer.current = setTimeout(() => {
      if (!wheelRef.current) return;
      const top = wheelRef.current.scrollTop;
      const nearest = Math.round(top / ITEM_H);
      const clamped = Math.max(
        0,
        Math.min(AVAILABLE_VOICES.length - 1, nearest)
      );
      const next = AVAILABLE_VOICES[clamped];
      if (next && next.key !== selectedKey) onSelect(next.key);
    }, 80);
  }, [disabled, onSelect, selectedKey]);

  const tapVoice = (key: string) => {
    if (disabled) return;
    onSelect(key);
    // Smooth-scroll the wheel to the tapped item so the centre band reflects it.
    const newIdx = AVAILABLE_VOICES.findIndex((v) => v.key === key);
    if (newIdx >= 0 && wheelRef.current) {
      wheelRef.current.scrollTo({ top: newIdx * ITEM_H, behavior: "smooth" });
    }
  };

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      {/* COLLAPSED — single pill showing the current voice. Hidden when
          the parent has chosen defaultOpen (a screen dedicated to the
          picker). */}
      {!open && !defaultOpen && (
        <button
          onClick={() => !disabled && setOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full bg-chamber-800/80 backdrop-blur px-4 py-2.5 text-sm text-chamber-100 lowercase border border-chamber-700 hover:bg-chamber-700 transition-colors disabled:opacity-50"
        >
          <span className="text-chamber-400 text-xs uppercase tracking-widest">
            voice
          </span>
          <span className="font-medium">
            {selectedVoice?.name.toLowerCase()}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-chamber-400" />
        </button>
      )}

      {/* EXPANDED — scroll-wheel selector */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full overflow-hidden"
          >
            {showHint && (
              <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-chamber-500 text-center mb-3">
                choose a voice
              </p>
            )}

            <div className="relative w-full max-w-[280px] mx-auto">
              {/* Centre selection band */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 rounded-xl bg-chamber-800/70 border-y border-chamber-700"
                style={{ top: PAD, height: ITEM_H }}
              />

              {/* Soft top + bottom fades */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-12 z-10"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(8,8,12,1), rgba(8,8,12,0))",
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-12 z-10"
                style={{
                  background:
                    "linear-gradient(to top, rgba(8,8,12,1), rgba(8,8,12,0))",
                }}
              />

              {/* Scrollable wheel — CSS scroll-snap drives the snap-to-row
                  feel; the scroll handler emits onSelect once motion settles. */}
              <div
                ref={wheelRef}
                onScroll={handleScroll}
                className="relative overflow-y-auto no-scrollbar"
                style={{
                  height: WHEEL_H,
                  scrollSnapType: "y mandatory",
                  paddingTop: PAD,
                  paddingBottom: PAD,
                }}
              >
                {AVAILABLE_VOICES.map((voice) => {
                  const isActive = voice.key === selectedKey;
                  return (
                    <button
                      key={voice.key}
                      onClick={() => tapVoice(voice.key)}
                      disabled={disabled}
                      style={{
                        height: ITEM_H,
                        scrollSnapAlign: "center",
                      }}
                      className={`w-full flex items-center justify-center transition-all ${
                        isActive
                          ? "text-chamber-50 text-lg font-medium"
                          : "text-chamber-500 text-base hover:text-chamber-200"
                      }`}
                    >
                      {voice.name.toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-chamber-500 mt-3 lowercase max-w-xs text-center mx-auto">
              {selectedVoice?.description}
            </p>

            {!defaultOpen && (
              <button
                onClick={() => setOpen(false)}
                className="block mx-auto mt-4 text-xs text-chamber-400 hover:text-chamber-100 lowercase"
              >
                done
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
