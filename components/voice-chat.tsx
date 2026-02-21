"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  LiveKitRoom,
  useVoiceAssistant,
  RoomAudioRenderer,
  useLocalParticipant,
  useTranscriptions,
  useAudioPlayback,
  useRemoteParticipants,
  useConnectionState,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Mic, MicOff, Phone, PhoneOff, Loader2, X, Headphones, Volume2, Clock, Wifi, WifiOff } from "lucide-react";
import { clsx } from "clsx";
import type { Message } from "@/lib/types";
import { VoiceOrb } from "./voice-orb-3d";
import { VoiceSelector } from "./voice-selector";
import { DEFAULT_VOICE_KEY } from "@/lib/voices";

// localStorage key for priming screen preference
const PRIMING_DISMISSED_KEY = "sage-priming-dismissed";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface VoiceInsightsData {
  summary: string;
  keyPoints: string[];
  reflections: string[];
}

interface VoiceChatProps {
  onTranscript?: (message: Message) => void;
  onConnectionChange?: (connected: boolean) => void;
  onInsightsChange?: (insights: VoiceInsightsData | null) => void;
  onTopicChange?: (topic: string) => void;
}

interface VoiceInsight {
  summary: string;
  keyPoints: string[];
  reflections: string[];
}

function generateRoomName(): string {
  return `sage-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function generateParticipantName(): string {
  return `user-${Math.random().toString(36).substring(7)}`;
}

// Custom hook for responsive orb size
function useOrbSize() {
  const [size, setSize] = useState(180);

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 380) {
        setSize(140);
      } else if (width < 640) {
        setSize(160);
      } else {
        setSize(180);
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return size;
}

export function VoiceChat({ onTranscript, onConnectionChange, onInsightsChange, onTopicChange }: VoiceChatProps) {
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [token, setToken] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [roomName, setRoomName] = useState(generateRoomName);
  const [participantName, setParticipantName] = useState(generateParticipantName);
  const [error, setError] = useState<string>("");
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_KEY);
  const [showPriming, setShowPriming] = useState(false);
  const [primingChecked, setPrimingChecked] = useState(false);
  const orbSize = useOrbSize();

  // Check if user has dismissed priming screen before
  useEffect(() => {
    const dismissed = localStorage.getItem(PRIMING_DISMISSED_KEY);
    setShowPriming(!dismissed);
    setPrimingChecked(true);
  }, []);

  // Transcript and insights state
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [insights, setInsights] = useState<VoiceInsight | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Create a conversation in the database
  const createConversation = useCallback(async (problemStatement: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemStatement, title: `Voice: ${problemStatement.slice(0, 50)}` }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.id;
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
    return null;
  }, []);

  const addTranscriptMessage = useCallback((role: "user" | "assistant", content: string) => {
    setTranscript((prev) => {
      const isFirstUserMessage = role === "user" && prev.filter(m => m.role === "user").length === 0;
      if (isFirstUserMessage) {
        setCurrentTopic(content);
        // Schedule parent notification outside of setState to avoid React warning
        setTimeout(() => onTopicChange?.(content), 0);
        // Create conversation in database
        createConversation(content).then((id) => {
          if (id) {
            setConversationId(id);
            console.log("[Voice] Created conversation:", id);
          }
        });
      }
      return [...prev, { role, content, timestamp: new Date() }];
    });
  }, [onTopicChange, createConversation]);

  // Save messages and generate summary/insights via Inngest (durable background processing)
  const saveConversationAndGenerateInsights = useCallback(async (
    convId: string,
    conversationTranscript: TranscriptMessage[]
  ) => {
    if (conversationTranscript.length < 2) return;

    setIsLoadingInsights(true);
    try {
      // Queue durable background processing via Inngest
      // This handles: save messages, summarize, extract insights, update profile
      // Processing continues even if user refreshes/leaves the page
      await fetch("/api/conversation/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          type: "voice",
          transcript: conversationTranscript.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      console.log("[Voice] Queued conversation for background processing:", convId);

      // Generate immediate UI insights (doesn't save to DB, just for display)
      const insightsResponse = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: conversationTranscript.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (insightsResponse.ok) {
        const data = await insightsResponse.json();
        setInsights(data);
        onInsightsChange?.(data);
      }
    } catch (err) {
      console.error("Failed to process conversation:", err);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [onInsightsChange]);

  // Legacy function for when no conversation was created (unauthenticated)
  const generateInsights = useCallback(async (conversationTranscript: TranscriptMessage[]) => {
    if (conversationTranscript.length < 2) return;

    setIsLoadingInsights(true);
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: conversationTranscript.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data);
        onInsightsChange?.(data);
      }
    } catch (err) {
      console.error("Failed to generate insights:", err);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [onInsightsChange]);

  const connect = useCallback(async () => {
    setConnectionState("connecting");
    setError("");

    try {
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          participantName,
          voiceKey: selectedVoice,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get token");
      }

      const { token, url } = await response.json();

      if (!url) {
        throw new Error("LiveKit URL not configured. Please set LIVEKIT_URL in your environment.");
      }

      setToken(token);
      setServerUrl(url);
      setConnectionState("connected");
      onConnectionChange?.(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setConnectionState("disconnected");
    }
  }, [roomName, participantName, selectedVoice, onConnectionChange]);

  const disconnect = useCallback(() => {
    setToken("");
    setServerUrl("");
    setConnectionState("disconnected");
    onConnectionChange?.(false);

    // Show summary and generate insights if there was a conversation
    if (transcript.length >= 2) {
      setShowSummary(true);
      // Save to database if we have a conversation ID (authenticated user)
      if (conversationId) {
        saveConversationAndGenerateInsights(conversationId, transcript);
      } else {
        // Fallback for unauthenticated users - just generate UI insights
        generateInsights(transcript);
      }
    }
  }, [onConnectionChange, transcript, conversationId, saveConversationAndGenerateInsights, generateInsights]);

  const closeSummary = useCallback(() => {
    setShowSummary(false);
    setTranscript([]);
    setInsights(null);
    setCurrentTopic("");
    setConversationId(null);
    // Generate fresh room/participant names for next call
    setRoomName(generateRoomName());
    setParticipantName(generateParticipantName());
    onInsightsChange?.(null);
    onTopicChange?.("");
  }, [onInsightsChange, onTopicChange]);

  // Handle priming screen dismissal
  const handlePrimingReady = useCallback(() => {
    setShowPriming(false);
  }, []);

  const handlePrimingDontShowAgain = useCallback(() => {
    localStorage.setItem(PRIMING_DISMISSED_KEY, "true");
    setShowPriming(false);
  }, []);

  if (connectionState === "disconnected") {
    // Show priming screen if not dismissed (and we've checked localStorage)
    if (primingChecked && showPriming && !showSummary) {
      return (
        <div className="flex flex-col h-full min-h-[350px] sm:min-h-[400px] p-4 sm:p-6 relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 via-transparent to-stone-900/50 pointer-events-none" />

          <div className="flex-1 flex flex-col items-center justify-center z-10 gap-6 sm:gap-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-white/90">
                Prepare for your session
              </h2>
              <p className="text-sm text-stone-400">
                A moment to settle in
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-4 max-w-sm w-full">
              <div className="flex items-start gap-3 text-white/70">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Volume2 className="w-4 h-4 text-amber-400/70" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Find a quiet, comfortable space</p>
                  <p className="text-xs text-stone-500 mt-0.5">Where you can speak freely</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-white/70">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Headphones className="w-4 h-4 text-amber-400/70" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Use headphones for best experience</p>
                  <p className="text-xs text-stone-500 mt-0.5">Helps with audio clarity</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-white/70">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-amber-400/70" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Give yourself 5-10 unhurried minutes</p>
                  <p className="text-xs text-stone-500 mt-0.5">There&apos;s no rush</p>
                </div>
              </div>
            </div>

            {/* Motivational text */}
            <p className="text-sm text-stone-400 text-center max-w-xs italic">
              This is a time for reflection.
            </p>

            {/* Buttons */}
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <button
                onClick={handlePrimingReady}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:from-amber-700 active:to-orange-700 rounded-full transition-all duration-300 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-95 touch-manipulation"
              >
                I&apos;m Ready
              </button>
              <button
                onClick={handlePrimingDontShowAgain}
                className="text-xs text-stone-500 hover:text-stone-400 transition-colors"
              >
                Don&apos;t show this again
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show conversation summary if there was a conversation
    if (showSummary) {
      return (
        <div className="flex flex-col h-full min-h-[350px] sm:min-h-[400px] p-4 sm:p-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between z-10 mb-6">
            <span className="text-sm text-white/40">Call ended</span>
            <button
              onClick={closeSummary}
              className="p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto z-10 space-y-6 pb-4">
            {isLoadingInsights ? (
              <div className="flex items-center gap-2 text-white/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            ) : insights ? (
              <div className="space-y-6">
                {/* Summary - just text, no box */}
                <p className="text-white/80 leading-relaxed">{insights.summary}</p>

                {/* Key Points - simple list */}
                {insights.keyPoints && insights.keyPoints.length > 0 && (
                  <ul className="space-y-2 text-white/70">
                    {insights.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-white/30 select-none">-</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Follow-ups - subtle */}
                {insights.reflections && insights.reflections.length > 0 && (
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-xs text-white/30 mb-2">To think about:</p>
                    {insights.reflections.map((reflection, i) => (
                      <p key={i} className="text-sm text-white/50 mb-1">
                        {reflection}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Transcript - collapsed by default feel */}
            <details className="group">
              <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50 transition-colors list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform">›</span>
                Full transcript
              </summary>
              <div className="mt-3 space-y-2 pl-3 border-l border-white/5">
                {transcript.map((msg, i) => (
                  <p key={i} className="text-xs text-white/40">
                    <span className="text-white/50">{msg.role === "user" ? "You" : "Sage"}:</span>{" "}
                    {msg.content}
                  </p>
                ))}
              </div>
            </details>
          </div>

          {/* Footer - simple text button */}
          <div className="z-10 pt-4">
            <button
              onClick={closeSummary}
              className="w-full py-3 text-sm text-white/60 hover:text-white/80 transition-colors"
            >
              Start another conversation
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] sm:min-h-[400px] gap-6 sm:gap-8 p-4 sm:p-6 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 via-transparent to-stone-900/50 pointer-events-none" />

        {/* Voice Orb - overflow visible for glow effects */}
        <div className="relative z-10 overflow-visible">
          <VoiceOrb state="idle" size={orbSize} />
        </div>

        <div className="z-10 text-center space-y-2 sm:space-y-4 px-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-white/90">
            Speak with Sage
          </h2>
          <p className="text-sm sm:text-base text-stone-400 max-w-md leading-relaxed">
            Have a conversation through voice. Ask questions, explore ideas, and discover answers together.
          </p>
        </div>

        <div className="z-20 w-full max-w-xs relative">
          <VoiceSelector
            selectedVoiceKey={selectedVoice}
            onSelect={setSelectedVoice}
          />
        </div>

        <button
          onClick={connect}
          className="z-10 flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:from-amber-700 active:to-orange-700 rounded-full transition-all duration-300 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-95 touch-manipulation"
        >
          <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">Talk to Sage</span>
        </button>

        {error && (
          <p className="z-10 text-red-400 text-xs sm:text-sm text-center max-w-md bg-red-500/10 px-4 py-2 rounded-lg">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (connectionState === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] sm:min-h-[400px] gap-6 sm:gap-8 p-4 sm:p-6 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 via-transparent to-stone-900/50 pointer-events-none" />

        {/* Pulsing orb - overflow visible for glow effects */}
        <div className="relative z-10 overflow-visible">
          <VoiceOrb state="thinking" size={orbSize} />
        </div>

        <div className="z-10 text-center space-y-2">
          <p className="text-base sm:text-lg text-white/90 font-medium">
            Connecting to Sage...
          </p>
          <p className="text-xs sm:text-sm text-stone-400">
            Preparing your session
          </p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={disconnect}
      className="flex flex-col h-full"
    >
      <ActiveVoiceChat
        onDisconnect={disconnect}
        onTranscript={onTranscript}
        addTranscriptMessage={addTranscriptMessage}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

interface ActiveVoiceChatProps {
  onDisconnect: () => void;
  onTranscript?: (message: Message) => void;
  addTranscriptMessage: (role: "user" | "assistant", content: string) => void;
}

function ActiveVoiceChat({ onDisconnect, onTranscript, addTranscriptMessage }: ActiveVoiceChatProps) {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const localParticipant = useLocalParticipant();
  const transcriptions = useTranscriptions({});
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();
  const { canPlayAudio, startAudio } = useAudioPlayback();
  const [isMuted, setIsMuted] = useState(true); // Start muted until agent is ready
  const [agentAudioLevel, setAgentAudioLevel] = useState(0);
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<"good" | "fair" | "poor">("good");
  const [showNoiseWarning, setShowNoiseWarning] = useState(false);
  const noiseHistoryRef = useRef<number[]>([]);
  const transcriptIdRef = useRef(0);
  const agentAnalyserRef = useRef<AnalyserNode | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const processedAgentSegmentsRef = useRef<Set<string>>(new Set<string>());
  const processedUserTextsRef = useRef<Set<string>>(new Set<string>());

  // Monitor network quality based on connection state
  useEffect(() => {
    // LiveKit connection quality tracking
    // "connected" is good, "reconnecting" indicates issues
    if (connectionState === "reconnecting") {
      setNetworkQuality("poor");
    } else if (connectionState === "connected") {
      // Check participant connection quality if available
      const quality = localParticipant.localParticipant?.connectionQuality;
      if (quality === "poor") {
        setNetworkQuality("poor");
      } else if (quality === "good") {
        setNetworkQuality("fair"); // "good" in LiveKit is actually just okay
      } else if (quality === "excellent") {
        setNetworkQuality("good");
      } else {
        setNetworkQuality("good"); // Default to good if unknown
      }
    }
  }, [connectionState, localParticipant.localParticipant?.connectionQuality]);

  // Initialize browser audio - retry on user interaction if autoplay blocked
  useEffect(() => {
    if (canPlayAudio) {
      console.log("[Voice] Audio already allowed");
      setAudioInitialized(true);
      return;
    }

    // Try startAudio immediately (may work if user gesture context still valid)
    startAudio().then(() => {
      console.log("[Voice] Audio initialized on mount");
      setAudioInitialized(true);
    }).catch((err) => {
      console.warn("[Voice] Autoplay blocked, will resume on next user interaction:", err.message);
    });

    // Fallback: resume audio on any user interaction (click/touch/keydown)
    const resumeAudio = () => {
      if (canPlayAudio) return;
      startAudio().then(() => {
        console.log("[Voice] Audio resumed via user interaction");
        setAudioInitialized(true);
        cleanup();
      }).catch(() => {});
    };

    const cleanup = () => {
      document.removeEventListener("click", resumeAudio);
      document.removeEventListener("touchstart", resumeAudio);
      document.removeEventListener("keydown", resumeAudio);
    };

    document.addEventListener("click", resumeAudio);
    document.addEventListener("touchstart", resumeAudio);
    document.addEventListener("keydown", resumeAudio);

    return cleanup;
  }, [startAudio, canPlayAudio]);

  // Detect agent readiness via lk.agent.state participant attribute
  const agentParticipant = remoteParticipants.find(p =>
    p.attributes?.['lk.agent.state']
  );
  const agentState = agentParticipant?.attributes?.['lk.agent.state'];
  const agentReady = audioInitialized && ['listening', 'thinking', 'speaking'].includes(agentState || '');

  // Debug logging for voice assistant state
  useEffect(() => {
    console.log("[Voice] State changed:", state, "| agentReady:", agentReady, "| agentState:", agentState, "| audioInitialized:", audioInitialized);
  }, [state, agentReady, agentState, audioInitialized]);

  // Responsive orb size for active chat (slightly larger)
  const [orbSize, setOrbSize] = useState(200);

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 380) {
        setOrbSize(160);
      } else if (width < 640) {
        setOrbSize(180);
      } else {
        setOrbSize(220);
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Enable microphone when agent is ready
  useEffect(() => {
    if (agentReady && isMuted) {
      console.log("[Voice] Agent ready, enabling microphone");
      setIsMuted(false);
      localParticipant.localParticipant?.setMicrophoneEnabled(true).catch((err) => {
        console.error("[Voice] Failed to enable microphone:", err);
      });
    }
  }, [agentReady, isMuted, localParticipant]);

  // Handle agent transcriptions - collect for insights
  useEffect(() => {
    if (agentTranscriptions && agentTranscriptions.length > 0) {
      const latest = agentTranscriptions[agentTranscriptions.length - 1];
      // Only process final segments to avoid duplicates
      if (latest.text && latest.final) {
        const segmentId = `${latest.firstReceivedTime}-${latest.text.slice(0, 20)}`;
        if (!processedAgentSegmentsRef.current.has(segmentId)) {
          processedAgentSegmentsRef.current.add(segmentId);
          addTranscriptMessage("assistant", latest.text);
          onTranscript?.({
            id: `agent-${transcriptIdRef.current++}`,
            role: "assistant",
            content: latest.text,
            timestamp: new Date(),
          });
        }
      }
    }
  }, [agentTranscriptions, onTranscript, addTranscriptMessage]);

  // Handle user transcriptions from LiveKit text streams
  useEffect(() => {
    if (transcriptions && transcriptions.length > 0) {
      transcriptions.forEach((stream) => {
        // Check if this is user text (not from agent)
        if (stream.text && stream.participantInfo?.identity) {
          // Skip if it's agent text or already processed
          const textKey = `${stream.participantInfo.identity}-${stream.text.slice(0, 30)}`;
          if (!processedUserTextsRef.current.has(textKey)) {
            // Only add if not from agent participant
            if (!stream.participantInfo.identity.includes('agent')) {
              processedUserTextsRef.current.add(textKey);
              addTranscriptMessage("user", stream.text);
            }
          }
        }
      });
    }
  }, [transcriptions, addTranscriptMessage]);

  // Set up audio analysis for agent audio (when Sage speaks)
  useEffect(() => {
    if (!audioTrack?.publication?.track) return;

    let audioContext: AudioContext | null = null;
    let isCleanedUp = false;

    const setupAudioAnalysis = async () => {
      try {
        const track = audioTrack.publication.track;
        if (!track?.mediaStreamTrack) {
          console.warn("[Voice] No agent media stream track available");
          return;
        }

        const mediaStream = new MediaStream([track.mediaStreamTrack]);
        audioContext = new AudioContext();

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        agentAnalyserRef.current = analyser;
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("[Voice] Agent audio analysis setup error:", err);
        }
      }
    };

    setupAudioAnalysis();

    return () => {
      isCleanedUp = true;
      agentAnalyserRef.current = null;
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
    };
  }, [audioTrack]);

  // Set up audio analysis for user microphone (when user speaks)
  useEffect(() => {
    if (isMuted || !agentReady) return;

    let audioContext: AudioContext | null = null;
    let isCleanedUp = false;

    const setupUserAudioAnalysis = async () => {
      try {
        // Get user's microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isCleanedUp) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        audioContext = new AudioContext();

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        userAnalyserRef.current = analyser;
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("[Voice] User audio analysis setup error:", err);
        }
      }
    };

    setupUserAudioAnalysis();

    return () => {
      isCleanedUp = true;
      userAnalyserRef.current = null;
      // Reset noise detection when microphone state changes
      noiseHistoryRef.current = [];
      setShowNoiseWarning(false);
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
    };
  }, [isMuted, agentReady]);

  // Animation loop for both audio levels + background noise detection
  useEffect(() => {
    let isCleanedUp = false;
    const agentDataArray = new Uint8Array(128);
    const userDataArray = new Uint8Array(128);
    let frameCount = 0;

    const updateLevels = () => {
      if (isCleanedUp) return;

      // Update agent audio level
      if (agentAnalyserRef.current) {
        agentAnalyserRef.current.getByteFrequencyData(agentDataArray);
        const agentAvg = agentDataArray.reduce((a, b) => a + b, 0) / agentDataArray.length;
        setAgentAudioLevel(agentAvg / 255);
      }

      // Update user audio level and detect background noise
      if (userAnalyserRef.current) {
        userAnalyserRef.current.getByteFrequencyData(userDataArray);
        const userAvg = userDataArray.reduce((a, b) => a + b, 0) / userDataArray.length;
        const normalizedLevel = userAvg / 255;
        setUserAudioLevel(normalizedLevel);

        // Background noise detection: sample every 10 frames (~6 times/second)
        frameCount++;
        if (frameCount % 10 === 0) {
          // Track noise levels over time (keep last 30 samples = ~5 seconds)
          noiseHistoryRef.current.push(normalizedLevel);
          if (noiseHistoryRef.current.length > 30) {
            noiseHistoryRef.current.shift();
          }

          // Check for consistent background noise after collecting enough samples
          if (noiseHistoryRef.current.length >= 20) {
            // Calculate the minimum level (floor) over the period
            // If the floor is consistently high, there's background noise
            const sortedLevels = [...noiseHistoryRef.current].sort((a, b) => a - b);
            const floorLevel = sortedLevels[Math.floor(sortedLevels.length * 0.2)]; // 20th percentile

            // If the background floor is above 0.08 (8%), show warning
            // This threshold avoids false positives while catching noisy environments
            const hasHighNoise = floorLevel > 0.08;
            setShowNoiseWarning(hasHighNoise);
          }
        }
      }

      animationRef.current = requestAnimationFrame(updateLevels);
    };

    updateLevels();

    return () => {
      isCleanedUp = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await localParticipant.localParticipant?.setMicrophoneEnabled(!newMuted);
  }, [isMuted, localParticipant]);

  const getStateLabel = () => {
    // Show progression of loading states
    if (!audioInitialized) {
      return "Initializing audio...";
    }
    if (!agentParticipant) {
      return "Connecting to Sage...";
    }
    if (!agentReady) {
      return "Sage is waking up...";
    }
    switch (state) {
      case "listening":
        return "Listening...";
      case "thinking":
        return "Sage is thinking...";
      case "speaking":
        return "Sage is speaking...";
      default:
        return "Ready";
    }
  };

  const getSubLabel = () => {
    if (!audioInitialized) {
      return "Setting up audio playback";
    }
    if (!agentParticipant) {
      return "Establishing connection";
    }
    if (!agentReady) {
      return "Preparing your session";
    }
    if (isMuted) {
      return "Microphone is muted";
    }
    return "Speak your thoughts";
  };

  const orbState = (!audioInitialized || !agentReady) ? "thinking" // Show thinking state while initializing/waiting
    : state === "listening" ? "listening"
    : state === "thinking" ? "thinking"
    : state === "speaking" ? "speaking"
    : "idle";

  // Use appropriate audio level based on state
  const activeAudioLevel = state === "speaking" ? agentAudioLevel
    : state === "listening" ? userAudioLevel
    : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[350px] sm:min-h-[400px] gap-6 sm:gap-8 p-4 sm:p-6 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 via-transparent to-stone-900/50 pointer-events-none" />

      {/* Network quality indicator - only show when there's an issue */}
      {networkQuality !== "good" && (
        <div className={clsx(
          "absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
          networkQuality === "poor"
            ? "bg-red-500/20 text-red-300"
            : "bg-yellow-500/20 text-yellow-300"
        )}>
          {networkQuality === "poor" ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Connection unstable</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>Weak connection</span>
            </>
          )}
        </div>
      )}

      {/* Background noise warning - only show when detected and network is fine */}
      {showNoiseWarning && networkQuality === "good" && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-yellow-500/20 text-yellow-300">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Background noise detected</span>
        </div>
      )}

      {/* Voice Orb - overflow visible for glow effects */}
      <div className="relative z-10 overflow-visible">
        <VoiceOrb
          state={orbState}
          audioLevel={activeAudioLevel}
          size={orbSize}
        />
      </div>

      {/* Status */}
      <div className="z-10 text-center">
        <p className="text-base sm:text-lg font-medium text-white/90">
          {getStateLabel()}
        </p>
        <p className="text-xs sm:text-sm text-stone-400 mt-1">
          {getSubLabel()}
        </p>
      </div>

      {/* Controls - Large touch targets */}
      <div className="flex items-center gap-4 sm:gap-6 z-10 pb-safe">
        <button
          onClick={toggleMute}
          disabled={!agentReady}
          className={clsx(
            "p-4 sm:p-5 rounded-full transition-all duration-300 shadow-lg touch-manipulation active:scale-95",
            !agentReady
              ? "bg-white/5 cursor-not-allowed opacity-50"
              : isMuted
              ? "bg-red-500/90 hover:bg-red-400 active:bg-red-600 shadow-red-500/20"
              : "bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-sm"
          )}
          aria-label={!agentReady ? "Waiting for Sage" : isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          ) : (
            <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          )}
        </button>

        <button
          onClick={onDisconnect}
          className="p-4 sm:p-5 rounded-full bg-red-500/90 hover:bg-red-400 active:bg-red-600 transition-all duration-300 shadow-lg shadow-red-500/20 touch-manipulation active:scale-95"
          aria-label="End call"
        >
          <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </button>
      </div>
    </div>
  );
}
