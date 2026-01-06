"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  LiveKitRoom,
  useVoiceAssistant,
  RoomAudioRenderer,
  useLocalParticipant,
  useTranscriptions,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Mic, MicOff, Phone, PhoneOff, Loader2, X } from "lucide-react";
import { clsx } from "clsx";
import type { Message } from "@/lib/types";
import { VoiceOrb } from "./voice-orb";
import { VoiceSelector } from "./voice-selector";
import { DEFAULT_VOICE_KEY } from "@/lib/voices";

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
  const [roomName] = useState(generateRoomName);
  const [participantName] = useState(generateParticipantName);
  const [error, setError] = useState<string>("");
  const orbSize = useOrbSize();

  // Voice selection state with localStorage persistence
  const [selectedVoiceKey, setSelectedVoiceKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sage-voice-preference") || DEFAULT_VOICE_KEY;
    }
    return DEFAULT_VOICE_KEY;
  });

  // Persist voice selection to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sage-voice-preference", selectedVoiceKey);
    }
  }, [selectedVoiceKey]);

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
          voiceKey: selectedVoiceKey,
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
  }, [roomName, participantName, selectedVoiceKey, onConnectionChange]);

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
    onInsightsChange?.(null);
    onTopicChange?.("");
  }, [onInsightsChange, onTopicChange]);

  if (connectionState === "disconnected") {
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

        {/* Sage portrait with orb effect */}
        <div className="relative z-10">
          <VoiceOrb state="idle" size={orbSize} />
          {/* Sage face overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="rounded-full overflow-hidden opacity-80"
              style={{ width: orbSize * 0.55, height: orbSize * 0.55 }}
            >
              <img
                src="/sage.png"
                alt="Sage"
                className="w-full h-full object-cover object-top scale-150"
              />
            </div>
          </div>
        </div>

        <div className="z-10 text-center space-y-2 sm:space-y-4 px-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-white/90">
            Speak with Sage
          </h2>
          <p className="text-sm sm:text-base text-stone-400 max-w-md leading-relaxed">
            Have a conversation through voice. Ask questions, explore ideas, and discover answers together.
          </p>
        </div>

        {/* Voice selector */}
        <div className="z-10 w-full max-w-xs px-4">
          <VoiceSelector
            selectedVoiceKey={selectedVoiceKey}
            onSelect={setSelectedVoiceKey}
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

        {/* Pulsing orb */}
        <div className="relative z-10">
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
  const [isMuted, setIsMuted] = useState(true); // Start muted until agent is ready
  const [audioLevel, setAudioLevel] = useState(0);
  const [agentReady, setAgentReady] = useState(false);
  const transcriptIdRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const processedAgentSegmentsRef = useRef<Set<string>>(new Set<string>());
  const processedUserTextsRef = useRef<Set<string>>(new Set<string>());
  const hasReceivedAudioRef = useRef(false);

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

  // Detect when agent is ready (first audio track or speaking state)
  useEffect(() => {
    if (!hasReceivedAudioRef.current && (audioTrack || state === "speaking")) {
      hasReceivedAudioRef.current = true;
      setAgentReady(true);
      // Unmute user's mic once agent is ready
      setIsMuted(false);
      localParticipant.localParticipant?.setMicrophoneEnabled(true);
    }
  }, [audioTrack, state, localParticipant]);

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

  // Set up audio analysis for visualizer
  useEffect(() => {
    if (!audioTrack?.publication?.track) return;

    const track = audioTrack.publication.track;
    const mediaStream = new MediaStream([track.mediaStreamTrack]);
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
      }
      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [audioTrack]);

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await localParticipant.localParticipant?.setMicrophoneEnabled(!newMuted);
  }, [isMuted, localParticipant]);

  const getStateLabel = () => {
    if (!agentReady) {
      return "Waiting for Sage...";
    }
    switch (state) {
      case "listening":
        return "Listening...";
      case "thinking":
        return "Sage is thinking...";
      case "speaking":
        return "Sage is speaking...";
      default:
        return "Connected";
    }
  };

  const getSubLabel = () => {
    if (!agentReady) {
      return "Sage is preparing to speak";
    }
    if (isMuted) {
      return "Microphone is muted";
    }
    return "Speak your thoughts";
  };

  const orbState = !agentReady ? "thinking" // Show thinking state while waiting for agent
    : state === "listening" ? "listening"
    : state === "thinking" ? "thinking"
    : state === "speaking" ? "speaking"
    : "idle";

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[350px] sm:min-h-[400px] gap-6 sm:gap-8 p-4 sm:p-6 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 via-transparent to-stone-900/50 pointer-events-none" />

      {/* Voice Orb with Sage */}
      <div className="relative z-10">
        <VoiceOrb
          state={orbState}
          audioLevel={audioLevel}
          size={orbSize}
        />
        {/* Sage face - fades based on state */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
          style={{ opacity: state === "speaking" ? 0.4 : 0.7 }}
        >
          <div
            className="rounded-full overflow-hidden"
            style={{ width: orbSize * 0.55, height: orbSize * 0.55 }}
          >
            <img
              src="/sage.png"
              alt="Sage"
              className="w-full h-full object-cover object-top scale-150"
            />
          </div>
        </div>
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
