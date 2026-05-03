"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useLocalParticipant,
  useConnectionState,
  useTranscriptions,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { ConnectionState } from "livekit-client";
import {
  X,
  Loader2,
  Square,
  Moon,
  Check,
  Mic,
  MicOff,
  AudioLines,
} from "lucide-react";
import { VoiceOrb, type OrbState } from "@/components/voice-orb-3d";
import { VoicePickerSheet } from "@/components/v2/voice-picker-sheet";
import { RecommendationCard } from "@/components/v2/recommendation-card";
import { DEFAULT_VOICE_KEY } from "@/lib/voices";
import { useRecommendationStream } from "@/lib/use-recommendation-stream";

const VOICE_KEY_STORAGE = "sage-v2-voice-key";

function genRoom() {
  return `sage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function genParticipant() {
  return `user-${Math.random().toString(36).slice(2, 9)}`;
}

type Turn = { role: "user" | "assistant"; content: string };

export default function VoiceChatPage() {
  const { status } = useSession();
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "connecting" | "live" | "ending">("idle");
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_KEY);
  // Ghost mode is shared with /ghost (the toggle screen) and the text chat
  // hook via localStorage. Read once at mount + listen for cross-tab changes.
  const [ghostMode, setGhostMode] = useState(false);
  const room = useRef(genRoom());
  const participant = useRef(genParticipant());

  // Restore prior voice choice on mount.
  useEffect(() => {
    const stored = localStorage.getItem(VOICE_KEY_STORAGE);
    if (stored) setSelectedVoice(stored);
    setGhostMode(localStorage.getItem("sage-ghost-mode") === "1");
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sage-ghost-mode") setGhostMode(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist whenever the selection changes.
  const handleVoiceChange = useCallback((key: string) => {
    setSelectedVoice(key);
    try {
      localStorage.setItem(VOICE_KEY_STORAGE, key);
    } catch {
      /* ignore quota errors */
    }
  }, []);

  // Live transcript collected during the call. Lives in a ref so the
  // child component can append without re-rendering the parent on every
  // partial transcription. Sent to /api/conversation/end on finish, then
  // discarded — never persisted as Message rows.
  const transcriptRef = useRef<Turn[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?next=/chat/voice");
    }
  }, [status, router]);

  const start = useCallback(async () => {
    setPhase("connecting");
    setError("");
    transcriptRef.current = [];
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: room.current,
          participantName: participant.current,
          voiceKey: selectedVoice,
          ghost: ghostMode,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("please sign in to talk to sage.");
        if (res.status === 402) throw new Error("you're out of credits.");
        throw new Error(data.error || "couldn't connect");
      }
      const { token, url, conversationId } = await res.json();
      if (!url) throw new Error("livekit url not configured");
      setToken(token);
      setServerUrl(url);
      setConversationId(conversationId ?? null);
      setPhase("live");
    } catch (err) {
      setError(err instanceof Error ? err.message : "connection failed");
      setPhase("idle");
    }
  }, [selectedVoice, ghostMode]);

  const recommendationStream = useRecommendationStream();
  // Avoid double-firing finish() when LiveKit's onDisconnected races with the
  // user clicking the finish button.
  const finishedRef = useRef(false);

  const navigateAfterFinish = useCallback(() => {
    router.push(
      conversationId
        ? `/entries/active?id=${conversationId}`
        : "/entries"
    );
  }, [conversationId, router]);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase("ending");
    if (conversationId) {
      try {
        await fetch("/api/conversation/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            type: "voice",
            transcript: transcriptRef.current,
          }),
        });
      } catch {
        // best-effort end
      }
      // Kick off the recommendation stream. If it returns a card, the UI
      // shows it and waits for the user to dismiss before navigating. If
      // it returns null (no good match) we navigate immediately.
      recommendationStream.start({ conversationId });
    } else {
      navigateAfterFinish();
    }
  }, [conversationId, recommendationStream, navigateAfterFinish]);

  // When the stream resolves with no card, navigate. When it produces a card,
  // the card itself triggers navigateAfterFinish via onDismiss.
  useEffect(() => {
    if (
      phase === "ending" &&
      conversationId &&
      (recommendationStream.phase === "done" ||
        recommendationStream.phase === "error") &&
      !recommendationStream.recommendation
    ) {
      navigateAfterFinish();
    }
  }, [
    phase,
    conversationId,
    recommendationStream.phase,
    recommendationStream.recommendation,
    navigateAfterFinish,
  ]);

  const recordTurn = useCallback((turn: Turn) => {
    transcriptRef.current.push(turn);
  }, []);

  if (status !== "authenticated") {
    return (
      <div className="v2-screen bg-chamber-900 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
      </div>
    );
  }

  return (
    // Full-bleed on desktop — voice should feel ambient and immersive, not
    // boxed inside the default centred phone shape. lg:!max-w-none breaks
    // out of v2-screen's desktop max-width.
    <div className="v2-screen bg-chamber-900 px-0 relative overflow-hidden lg:!max-w-none lg:min-h-[100dvh]">
      {/* Ambient ember halo — scales up on desktop */}
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

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] relative z-10 lg:px-8 lg:pt-6">
        <Link
          href="/home"
          className="h-9 w-9 rounded-full bg-chamber-800/80 backdrop-blur flex items-center justify-center lg:h-11 lg:w-11"
          aria-label="close"
        >
          <X className="h-4 w-4 text-chamber-100 lg:h-5 lg:w-5" />
        </Link>
        <div className="inline-flex items-center gap-1.5 text-sm text-chamber-100 lowercase lg:text-base lg:gap-2 lg:bg-chamber-900/60 lg:backdrop-blur lg:rounded-full lg:px-4 lg:py-2">
          <AudioLines className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2.2} />
          talk
        </div>
        <span className="w-9 lg:w-11" />
      </div>

      {phase === "live" && token && serverUrl ? (
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          audio
          video={false}
          onDisconnected={finish}
          className="relative z-10 flex-1 flex flex-col"
        >
          <RoomAudioRenderer />
          <LiveSession onFinish={finish} onTurn={recordTurn} ghost={ghostMode} />
        </LiveKitRoom>
      ) : phase === "ending" ? (
        // Wrapping up — keep the orb visible so we don't flash the start
        // screen while /api/conversation/end + the navigate to
        // /entries/active complete. If the matcher returns a recommendation,
        // we render the card here before navigating.
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-6 pb-10">
          {recommendationStream.recommendation ? (
            <RecommendationCard
              recommendation={recommendationStream.recommendation}
              onDismiss={navigateAfterFinish}
              variant="post-session"
            />
          ) : (
            <>
              <span className="lg:hidden">
                <VoiceOrb state="thinking" size={240} />
              </span>
              <span className="hidden lg:inline-block">
                <VoiceOrb state="thinking" size={440} />
              </span>
              <p className="text-sm text-chamber-300 lowercase tracking-wide">
                saving your session...
              </p>
            </>
          )}
        </div>
      ) : (
        // IdleSession's root already uses `flex-1 flex flex-col` so it can
        // be a direct child of the v2-screen flex column without a wrapper.
        <IdleSession
          phase={phase}
          error={error}
          onStart={start}
          selectedVoice={selectedVoice}
          onVoiceChange={handleVoiceChange}
          ghost={ghostMode}
        />
      )}
    </div>
  );
}

function IdleSession({
  phase,
  error,
  onStart,
  selectedVoice,
  onVoiceChange,
  ghost,
}: {
  phase: "idle" | "connecting" | "live" | "ending";
  error: string;
  onStart: () => void;
  selectedVoice: string;
  onVoiceChange: (key: string) => void;
  ghost: boolean;
}) {
  const isConnecting = phase === "connecting";

  // Layout: this component is a flex item inside a `flex-1 flex flex-col`
  // parent. We use `flex-1` (not `h-full`) on our root so we inherit the
  // available height via flex — `h-full` collapses to 0 here because the
  // ancestor uses `min-h-[100dvh]`, not `h-[100dvh]`.
  return (
    <div className="relative z-10 flex-1 flex flex-col min-h-0">
      {/* Orb takes the upper area, centred in the remaining vertical space. */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <span className="lg:hidden">
          <VoiceOrb state="idle" size={240} />
        </span>
        <span className="hidden lg:inline-block">
          <VoiceOrb state="idle" size={440} />
        </span>
      </div>

      {/* Bottom stack — tight, grouped, anchored at the bottom safe area */}
      <div className="flex-shrink-0 px-6 pb-10 lg:pb-14 flex flex-col items-center gap-3 lg:gap-4">
        <VoicePickerSheet
          selectedKey={selectedVoice}
          onSelect={onVoiceChange}
          disabled={isConnecting}
        />
        {/* Ghost-mode toggle — only visible from the start screen so an
            accidental tap mid-call can't navigate the user away. */}
        <Link
          href="/ghost"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-widest transition-colors ${
            ghost
              ? "bg-ember-500/15 text-ember-300 ring-1 ring-ember-500/30"
              : "text-chamber-500 hover:text-chamber-300"
          }`}
        >
          <Moon className="h-3 w-3" />
          ghost {ghost ? "· on" : "· off"}
        </Link>
        <p className="text-center text-sm text-chamber-300 lowercase max-w-xs lg:text-base lg:max-w-md">
          {error
            ? error
            : ghost
              ? "ghost mode is on — nothing from this session is saved."
              : "tap to start. sage will listen, then ask the questions worth asking."}
        </p>
        <button
          onClick={onStart}
          disabled={isConnecting}
          className="v2-btn v2-btn-primary w-full max-w-xs disabled:opacity-50 lg:max-w-sm lg:py-5 lg:text-base"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              connecting...
            </>
          ) : (
            "start session"
          )}
        </button>
      </div>
    </div>
  );
}

function LiveSession({
  onFinish,
  onTurn,
  ghost,
}: {
  onFinish: () => void;
  onTurn: (t: Turn) => void;
  ghost: boolean;
}) {
  const { state: agentState, agentTranscriptions } = useVoiceAssistant();
  const transcriptions = useTranscriptions({});
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const [muted, setMuted] = useState(false);

  // Dedupe sets — same pattern as v1 voice-chat. Final agent segments are
  // keyed by firstReceivedTime + text-prefix; user text streams are keyed
  // by participant identity + text-prefix.
  const seenAgentRef = useRef<Set<string>>(new Set());
  const seenUserRef = useRef<Set<string>>(new Set());

  // Capture FINAL agent transcriptions into the running transcript.
  useEffect(() => {
    if (!agentTranscriptions?.length) return;
    const latest = agentTranscriptions[agentTranscriptions.length - 1];
    if (!latest?.text || !latest.final) return;
    const key = `${latest.firstReceivedTime}-${latest.text.slice(0, 24)}`;
    if (seenAgentRef.current.has(key)) return;
    seenAgentRef.current.add(key);
    onTurn({ role: "assistant", content: latest.text });
  }, [agentTranscriptions, onTurn]);

  // Capture user text streams (LiveKit text channels carry final user speech).
  useEffect(() => {
    if (!transcriptions?.length) return;
    transcriptions.forEach((stream) => {
      const identity = stream.participantInfo?.identity;
      if (!stream.text || !identity) return;
      if (identity.includes("agent")) return; // skip agent — already captured above
      const key = `${identity}-${stream.text.slice(0, 30)}`;
      if (seenUserRef.current.has(key)) return;
      seenUserRef.current.add(key);
      onTurn({ role: "user", content: stream.text });
    });
  }, [transcriptions, onTurn]);

  // Map LiveKit/voice-assistant state to orb state
  let orbState: OrbState = "idle";
  if (connectionState === ConnectionState.Connecting) orbState = "thinking";
  else if (agentState === "speaking") orbState = "speaking";
  else if (agentState === "thinking") orbState = "thinking";
  else if (agentState === "listening") orbState = "listening";

  const label =
    connectionState !== ConnectionState.Connected
      ? "connecting…"
      : muted
      ? "you're muted"
      : agentState === "speaking"
      ? "sage is speaking"
      : agentState === "thinking"
      ? "thinking…"
      : "listening";

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localParticipant?.setMicrophoneEnabled(!next);
  };

  return (
    <>
      {/* Animated Sage orb in center */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <span className="lg:hidden">
          <VoiceOrb state={orbState} size={260} />
        </span>
        <span className="hidden lg:inline-block">
          <VoiceOrb state={orbState} size={440} />
        </span>
      </div>

      {/* Bottom controls — capped width so the three clusters don't drift
          to opposite edges of a wide desktop canvas. */}
      <div className="absolute bottom-12 left-0 right-0 px-6 z-10 lg:bottom-16">
        <div className="flex items-end justify-between mx-auto lg:max-w-2xl">
          {/* Left: stop button + status label */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onFinish}
              className="h-14 w-14 rounded-full bg-chamber-50 text-chamber-900 flex items-center justify-center shadow-lg active:scale-95 transition-transform lg:h-16 lg:w-16"
              aria-label="end session"
            >
              <Square className="h-5 w-5 fill-current lg:h-6 lg:w-6" />
            </button>
            <span className="text-xs text-chamber-200 lowercase lg:text-sm">{label}</span>
          </div>

          {/* Center: mute toggle */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={toggleMute}
              className={`h-12 w-12 rounded-full backdrop-blur flex items-center justify-center transition-colors ${
                muted
                  ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40"
                  : "bg-chamber-800/80 text-chamber-100"
              }`}
              aria-label={muted ? "unmute" : "mute"}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <span className="text-[10px] text-chamber-200 lowercase">
              {muted ? "unmute" : "mute"}
            </span>
          </div>

          {/* Right: ghost indicator (passive — toggle lives on /ghost) + finish */}
          <div className="flex flex-col gap-3">
            <div
              className={`flex flex-col items-center gap-1 ${
                ghost ? "" : "invisible"
              }`}
              aria-hidden={!ghost}
            >
              <span className="h-10 w-10 rounded-full bg-ember-500/15 ring-1 ring-ember-500/30 backdrop-blur text-ember-300 flex items-center justify-center">
                <Moon className="h-4 w-4" />
              </span>
              <span className="text-[10px] text-ember-300 lowercase">ghost</span>
            </div>
            <button onClick={onFinish} className="flex flex-col items-center gap-1">
              <span className="h-10 w-10 rounded-full bg-ember-500 text-white flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(224,124,56,0.6)]">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className="text-[10px] text-chamber-200 lowercase">finish</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
