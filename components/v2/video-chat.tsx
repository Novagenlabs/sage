"use client";

// v2 Anam video-avatar session.
//
// Mirrors /chat/voice's UX (idle → start → live → finish) but the orb is
// replaced with a streaming avatar. Same transcript-to-summary persistence:
// turns are buffered in a ref via Anam's MESSAGE_HISTORY_UPDATED event, then
// shipped to /api/conversation/end on finish.
//
// The Anam free tier caps sessions at ~180s; on CONNECTION_CLOSED with a
// non-NORMAL code, we automatically request a new token and reconnect so the
// user perceives a continuous conversation.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  X,
  Loader2,
  Square,
  Mic,
  MicOff,
  Check,
  Moon,
  Video,
} from "lucide-react";
import type { AnamClient, Message } from "@anam-ai/js-sdk";
import { VoiceOrb } from "@/components/voice-orb-3d";
import { RecommendationCard } from "@/components/v2/recommendation-card";
import { useRecommendationStream } from "@/lib/use-recommendation-stream";
import {
  VIDEO_CREDITS_PER_SECOND,
  AUTO_DISCONNECT_TIMEOUT_SECS,
  LOW_CREDITS_WARNING_SECS,
  videoSecondsToCredits,
} from "@/lib/credit-costs";

const VIDEO_ELEMENT_ID = "sage-anam-video";

// Anam closes the WebRTC session at this cap (free + most paid tiers).
// We auto-reconnect, but show a countdown so the user knows a brief refresh
// is coming.
const SESSION_MAX_SECONDS = 300;
const SESSION_WARNING_SECONDS = 30;

type Phase = "idle" | "connecting" | "live" | "ending";

type Turn = { role: "user" | "assistant"; content: string };

interface Props {
  /** User's current credit balance, used to bound session length */
  userCredits: number;
  /** Called when the user closes the screen (transcript already POSTed).
   *  conversationId is provided when a real session ran, so callers can
   *  route to the post-session annotation flow. */
  onClose: (conversationId: string | null) => void;
  /** Refresh session/credits after a session ends */
  onCreditsUpdate?: () => void;
}

export function VideoChat({ userCredits, onClose, onCreditsUpdate }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [statusLabel, setStatusLabel] = useState("connecting…");
  const [secondsLeft, setSecondsLeft] = useState(
    Math.floor(userCredits / VIDEO_CREDITS_PER_SECOND)
  );
  const [showLowWarning, setShowLowWarning] = useState(false);
  // Countdown until Anam's session-cap forces a reconnect. Resets on
  // CONNECTION_ESTABLISHED (initial connect + every reconnect).
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(SESSION_MAX_SECONDS);
  const sessionTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clientRef = useRef<AnamClient | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<Turn[]>([]);
  const seenMessageIds = useRef<Set<string>>(new Set());
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDisconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Total seconds of streamed video, summed across reconnects. Sent to the
  // server on finish so credits get debited based on actual time consumed.
  const streamedSecondsRef = useRef(0);
  // Set by finishSession() so the CONNECTION_CLOSED listener knows the close
  // came from us, not from Anam expiring our session — and skips reconnect.
  const userEndedRef = useRef(false);
  // Anam can fire CONNECTION_CLOSED twice for the same disconnection.
  // This guard prevents a double reconnect. Reset on each fresh connect.
  const closeHandledRef = useRef(false);

  // Ghost mode is shared with /ghost (the toggle screen) and the chat hook
  // via localStorage. Read once at mount + listen for cross-tab changes.
  const [ghostMode, setGhostMode] = useState(false);
  useEffect(() => {
    setGhostMode(localStorage.getItem("sage-ghost-mode") === "1");
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sage-ghost-mode") setGhostMode(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  // Capture the ghost flag at the moment the session starts so a mid-call
  // toggle can't change persistence behaviour for the in-flight session.
  const sessionGhostRef = useRef(false);

  // Generative-UI recommendation card streamed from /api/recommendations/stream
  // after the session ends. Mirrors the post-session flow on /chat/voice.
  const recommendationStream = useRecommendationStream();

  // Mint a token + (when not in ghost mode) a Conversation row.
  const fetchSession = useCallback(async (ghost: boolean) => {
    const res = await fetch("/api/anam/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ghost }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error("please sign in to start a video session.");
      if (res.status === 402) throw new Error("you're out of credits.");
      throw new Error(data.error || "couldn't start a video session");
    }
    return (await res.json()) as { sessionToken: string; conversationId: string | null };
  }, []);

  // POST whatever transcript we have to the summariser pipeline.
  const finishSession = useCallback(async () => {
    userEndedRef.current = true;
    setPhase("ending");
    if (tickerRef.current) clearInterval(tickerRef.current);
    if (sessionTickerRef.current) clearInterval(sessionTickerRef.current);
    if (autoDisconnectRef.current) clearTimeout(autoDisconnectRef.current);

    try {
      await clientRef.current?.stopStreaming();
    } catch {
      /* best-effort */
    }
    clientRef.current = null;

    const conversationId = conversationIdRef.current;
    const streamedSecs = streamedSecondsRef.current;

    // Bill for the streamed video time. Always deducts — ghost mode hides
    // the conversation but the user still consumed real video minutes. The
    // deduct endpoint accepts an optional conversationId, so ghost sessions
    // record an unattributed transaction.
    if (streamedSecs > 0) {
      const credits = videoSecondsToCredits(streamedSecs);
      try {
        await fetch("/api/credits/deduct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: credits,
            type: "video",
            conversationId: conversationId ?? undefined,
            durationSeconds: streamedSecs,
          }),
        });
      } catch (err) {
        console.error("[Anam] credit deduction failed:", err);
      }
    }

    // Send the transcript to the summariser pipeline. Skipped entirely in
    // ghost mode — there's no Conversation row to attach it to.
    if (conversationId && transcriptRef.current.length > 0) {
      try {
        await fetch("/api/conversation/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            type: "video",
            transcript: transcriptRef.current,
          }),
        });
      } catch {
        /* best-effort end */
      }
    }
    onCreditsUpdate?.();
    // Kick off the recommendation stream and let the UI either render the
    // card or navigate via the post-stream effect below. Skipped in ghost
    // mode (no conversationId).
    if (conversationId) {
      recommendationStream.start({ conversationId });
    } else {
      onClose(conversationId);
    }
  }, [onClose, onCreditsUpdate, recommendationStream]);

  // Ref for the latest finish handler so listeners can call the live closure
  // without being recreated each render.
  const finishRef = useRef(finishSession);
  useEffect(() => {
    finishRef.current = finishSession;
  }, [finishSession]);

  // After the recommendation stream resolves with no card (or errors), close
  // the session immediately. If a card arrived, the card itself triggers
  // onClose via its onDismiss prop after the user gives feedback.
  useEffect(() => {
    if (
      phase === "ending" &&
      (recommendationStream.phase === "done" ||
        recommendationStream.phase === "error") &&
      !recommendationStream.recommendation
    ) {
      onClose(conversationIdRef.current);
    }
  }, [phase, recommendationStream.phase, recommendationStream.recommendation, onClose]);

  // Wire up Anam events on a freshly-created client.
  const wireClient = useCallback(async (client: AnamClient) => {
    const { AnamEvent, MessageRole } = await import("@anam-ai/js-sdk");

    closeHandledRef.current = false;

    client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
      console.log("[Anam] connection established");
      setStatusLabel("listening");
      // Reset session countdown — applies to first connect + every reconnect.
      setSessionSecondsLeft(SESSION_MAX_SECONDS);
      if (sessionTickerRef.current) clearInterval(sessionTickerRef.current);
      sessionTickerRef.current = setInterval(() => {
        setSessionSecondsLeft((prev) => Math.max(0, prev - 1));
        // Tick the cumulative streamed-seconds counter — this is what
        // the server uses to bill on finish.
        streamedSecondsRef.current += 1;
      }, 1000);
    });

    // Anam fires (code, reason). On free/paid tiers Anam closes the session
    // when its max-duration cap hits — we want to silently re-mint a token
    // and keep the conversation going. For all other closes (server error,
    // mic denied, user ended) we tear down.
    client.addListener(
      AnamEvent.CONNECTION_CLOSED,
      ((code: unknown, reason: unknown) => {
        if (closeHandledRef.current) return;
        closeHandledRef.current = true;

        // Pause the session countdown immediately on close — we'll reset it
        // when CONNECTION_ESTABLISHED fires for the new session.
        if (sessionTickerRef.current) {
          clearInterval(sessionTickerRef.current);
          sessionTickerRef.current = null;
        }

        // User clicked finish — no reconnect, just let cleanup proceed.
        if (userEndedRef.current) {
          console.log("[Anam] connection closed (user-ended)");
          return;
        }

        const reasonStr = String(reason ?? code ?? "").toLowerCase();
        console.log("[Anam] connection closed:", code, reason);

        const isMaxDuration =
          reasonStr.includes("max duration") ||
          reasonStr.includes("max_duration") ||
          reasonStr.includes("session expired") ||
          // Anam's published tier limits in seconds — match either.
          reasonStr.includes("180") ||
          reasonStr.includes("300");

        if (isMaxDuration) {
          setStatusLabel("reconnecting…");
          // Tiny settle delay — Anam needs a moment to release the old session.
          setTimeout(() => {
            reconnect().catch((e) => console.error("[Anam] reconnect failed", e));
          }, 2000);
          return;
        }

        // Unexpected close — surface as an error and let the user retry.
        setError(reasonStr || "connection lost. tap finish and try again.");
      }) as (...args: unknown[]) => void
    );

    client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (messages: Message[]) => {
      for (const m of messages) {
        if (seenMessageIds.current.has(m.id)) continue;
        seenMessageIds.current.add(m.id);
        const role = m.role === MessageRole.USER ? "user" : "assistant";
        if (m.content?.trim()) {
          transcriptRef.current.push({ role, content: m.content.trim() });
        }
      }
    });

    client.addListener(AnamEvent.USER_SPEECH_STARTED, () => {
      setStatusLabel("listening");
    });

    client.addListener(AnamEvent.AUDIO_STREAM_STARTED, () => {
      setStatusLabel("sage is speaking");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-mint a token and re-attach to the same video element.
  const reconnect = useCallback(async () => {
    setStatusLabel("reconnecting…");
    try {
      // Reuse the ghost flag from the original session so a mid-call toggle
      // can't switch a private session into a persisted one mid-flight.
      const { sessionToken } = await fetchSession(sessionGhostRef.current);
      const { createClient } = await import("@anam-ai/js-sdk");
      const next = createClient(sessionToken);
      await wireClient(next);
      await next.streamToVideoElement(VIDEO_ELEMENT_ID);
      clientRef.current = next;
      setStatusLabel("listening");
    } catch (err) {
      console.error("[Anam] reconnect error", err);
      setError(err instanceof Error ? err.message : "reconnect failed");
      finishRef.current();
    }
  }, [fetchSession, wireClient]);

  const start = useCallback(async () => {
    setPhase("connecting");
    setError("");
    transcriptRef.current = [];
    seenMessageIds.current = new Set();
    userEndedRef.current = false;
    closeHandledRef.current = false;
    sessionGhostRef.current = ghostMode;

    try {
      const { sessionToken, conversationId } = await fetchSession(ghostMode);
      conversationIdRef.current = conversationId;

      const { createClient } = await import("@anam-ai/js-sdk");
      const client = createClient(sessionToken);
      await wireClient(client);
      await client.streamToVideoElement(VIDEO_ELEMENT_ID);
      clientRef.current = client;

      // Start the credit-based countdown.
      setPhase("live");
      tickerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          const next = prev - 1;
          if (next === LOW_CREDITS_WARNING_SECS) setShowLowWarning(true);
          if (next <= 0) {
            // Out of credits. Give a brief grace then auto-finish.
            if (!autoDisconnectRef.current) {
              autoDisconnectRef.current = setTimeout(
                () => finishRef.current(),
                AUTO_DISCONNECT_TIMEOUT_SECS * 1000
              );
            }
            return 0;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't start session");
      setPhase("idle");
    }
  }, [fetchSession, wireClient, ghostMode]);

  // Cleanup on unmount: stop streaming, clear timers.
  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (sessionTickerRef.current) clearInterval(sessionTickerRef.current);
      if (autoDisconnectRef.current) clearTimeout(autoDisconnectRef.current);
      clientRef.current?.stopStreaming().catch(() => {});
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try {
      if (next) clientRef.current?.muteInputAudio();
      else clientRef.current?.unmuteInputAudio();
    } catch {
      /* ignore */
    }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative h-[100dvh] w-full bg-chamber-900 overflow-hidden">
      {/* The avatar fills the whole screen on every breakpoint. */}
      <video
        id={VIDEO_ELEMENT_ID}
        autoPlay
        playsInline
        muted={false}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          phase === "live" ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Idle/connecting fallback — orb + halo, same vocabulary as /chat/voice */}
      {phase !== "live" && (
        <>
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] lg:w-[820px] lg:h-[820px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(224,124,56,0.55) 0%, rgba(224,124,56,0.2) 35%, transparent 70%)",
                filter: "blur(40px)",
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="relative z-10 flex h-full flex-col items-center justify-center pb-32">
            <span className="lg:hidden">
              <VoiceOrb
                state={phase === "idle" ? "idle" : "thinking"}
                size={240}
              />
            </span>
            <span className="hidden lg:inline-block">
              <VoiceOrb
                state={phase === "idle" ? "idle" : "thinking"}
                size={360}
              />
            </span>
          </div>
        </>
      )}

      {/* Scrim so overlays stay readable on top of the avatar */}
      {phase === "live" && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />
      )}

      {/* Top bar — capped to a max-width on desktop so the chrome doesn't
          stretch across an ultrawide screen. */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] lg:px-10 lg:pt-8 lg:max-w-6xl lg:mx-auto">
        <button
          onClick={() => (phase === "live" ? finishSession() : onClose(null))}
          className="h-9 w-9 rounded-full bg-chamber-900/70 backdrop-blur flex items-center justify-center"
          aria-label="close"
        >
          <X className="h-4 w-4 text-chamber-100" />
        </button>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-chamber-900/70 backdrop-blur px-3 py-1.5 text-sm text-chamber-100 lowercase">
          <Video className="h-4 w-4" />
          video
        </div>
        {phase === "live" ? (
          <SessionTimerChip
            sessionSecondsLeft={sessionSecondsLeft}
            creditSecondsLeft={secondsLeft}
            lowCredits={showLowWarning}
          />
        ) : (
          <span className="w-9" />
        )}
      </div>

      {/* Bottom controls — capped on desktop so the three clusters stay
          grouped instead of spreading across the full viewport. */}
      <div className="absolute bottom-12 left-0 right-0 z-20 px-6 lg:bottom-16 lg:px-10 lg:max-w-3xl lg:left-1/2 lg:-translate-x-1/2">
        {phase === "live" ? (
          <div className="flex items-end justify-between mx-auto lg:max-w-2xl">
            {/* Stop */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={finishSession}
                className="h-14 w-14 rounded-full bg-chamber-50 text-chamber-900 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                aria-label="end session"
              >
                <Square className="h-5 w-5 fill-current" />
              </button>
              <span className="text-xs text-chamber-100 lowercase">{statusLabel}</span>
            </div>

            {/* Mute */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={toggleMute}
                className={`h-12 w-12 rounded-full backdrop-blur flex items-center justify-center transition-colors ${
                  muted
                    ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40"
                    : "bg-chamber-900/70 text-chamber-100"
                }`}
                aria-label={muted ? "unmute" : "mute"}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <span className="text-[10px] text-chamber-100 lowercase">
                {muted ? "unmute" : "mute"}
              </span>
            </div>

            {/* Right cluster — ghost indicator (passive) + finish */}
            <div className="flex flex-col gap-3">
              <div
                className={`flex flex-col items-center gap-1 ${
                  sessionGhostRef.current ? "" : "invisible"
                }`}
                aria-hidden={!sessionGhostRef.current}
              >
                <span className="h-10 w-10 rounded-full bg-ember-500/15 ring-1 ring-ember-500/30 backdrop-blur text-ember-300 flex items-center justify-center">
                  <Moon className="h-4 w-4" />
                </span>
                <span className="text-[10px] text-ember-300 lowercase">ghost</span>
              </div>
              <button onClick={finishSession} className="flex flex-col items-center gap-1">
                <span className="h-10 w-10 rounded-full bg-ember-500 text-white flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(224,124,56,0.6)]">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <span className="text-[10px] text-chamber-100 lowercase">finish</span>
              </button>
            </div>
          </div>
        ) : phase === "ending" ? (
          // Don't flash the start screen while /api/conversation/end + the
          // navigate to /entries/active complete. If the matcher returns a
          // recommendation, render its card here before navigating.
          recommendationStream.recommendation ? (
            <div className="flex justify-center">
              <RecommendationCard
                recommendation={recommendationStream.recommendation}
                onDismiss={() => onClose(conversationIdRef.current)}
                variant="post-session"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-chamber-200" />
              <p className="text-sm text-chamber-300 lowercase tracking-wide">
                saving your session...
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center gap-4 lg:gap-5">
            <Link
              href="/ghost"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-widest transition-colors ${
                ghostMode
                  ? "bg-ember-500/15 text-ember-300 ring-1 ring-ember-500/30"
                  : "text-chamber-400 hover:text-chamber-200"
              }`}
            >
              <Moon className="h-3 w-3" />
              ghost {ghostMode ? "· on" : "· off"}
            </Link>
            <p className="text-center text-sm text-chamber-300 lowercase max-w-xs lg:text-base lg:max-w-md">
              {error
                ? error
                : ghostMode
                  ? "ghost mode is on — nothing from this session is saved."
                  : "tap to see sage. same conversation, with a face. uses ~3× the credits of voice."}
            </p>
            <button
              onClick={start}
              disabled={phase === "connecting"}
              className="v2-btn v2-btn-primary w-full max-w-xs disabled:opacity-50 lg:max-w-sm lg:py-5 lg:text-base"
            >
              {phase === "connecting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  connecting…
                </>
              ) : (
                "start video session"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Top-right pill on the video screen.
 *
 *   Primary line  → countdown until Anam closes the session and we
 *                   auto-reconnect (5-min cap).
 *   Secondary line → user's remaining credit time.
 *
 * Pill turns amber when the session is about to refresh, red when the user
 * is about to run out of credits — credit-out is the more serious state.
 */
function SessionTimerChip({
  sessionSecondsLeft,
  creditSecondsLeft,
  lowCredits,
}: {
  sessionSecondsLeft: number;
  creditSecondsLeft: number;
  lowCredits: boolean;
}) {
  const aboutToRefresh = sessionSecondsLeft <= SESSION_WARNING_SECONDS;

  const tone = lowCredits
    ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40"
    : aboutToRefresh
    ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40"
    : "bg-chamber-900/70 text-chamber-100";

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`flex flex-col items-end rounded-2xl px-3 py-1.5 backdrop-blur leading-tight ${tone}`}
    >
      <span className="text-sm font-medium tabular-nums">
        {fmt(sessionSecondsLeft)}
        {aboutToRefresh && (
          <span className="ml-1 text-[10px] uppercase tracking-widest opacity-80">
            refresh
          </span>
        )}
      </span>
      <span className="text-[10px] opacity-60 lowercase tabular-nums">
        {fmt(creditSecondsLeft)} credit
      </span>
    </div>
  );
}
