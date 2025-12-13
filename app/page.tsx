"use client";

import { useRef, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu, MessageSquare, Mic, RotateCcw, ChevronRight, User } from "lucide-react";
import { useSocraticChat } from "@/lib/use-chat";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ModelSelector } from "@/components/model-selector";
import { PhaseIndicator } from "@/components/phase-indicator";
import { Sidebar } from "@/components/sidebar";
import { VoiceChat } from "@/components/voice-chat";
import { AuthHeader } from "@/components/auth/auth-header";
import { clsx } from "clsx";
import type { Insight } from "@/lib/types";

type Mode = "text" | "voice";

interface VoiceInsightsData {
  summary: string;
  keyPoints: string[];
  reflections: string[];
}

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  const {
    messages,
    phase,
    insights,
    problemStatement,
    modelId,
    isLoading,
    sendMessage,
    setModel,
    reset,
  } = useSocraticChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("text");
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceInsights, setVoiceInsights] = useState<VoiceInsightsData | null>(null);
  const [voiceTopic, setVoiceTopic] = useState<string>("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const hasMessages = messages.length > 0;

  // Wrapper to check auth before sending message
  const handleSendMessage = (message: string) => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    sendMessage(message);
  };

  return (
    <div className="flex h-screen-safe bg-[#0a0a0f] text-white overflow-hidden">
      {/* Ambient background glow - warm subtle tones */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-amber-500/[0.03] rounded-full blur-[80px] sm:blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-orange-500/[0.02] rounded-full blur-[60px] sm:blur-[100px]" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header - Mobile optimized */}
        <header className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-black/20 backdrop-blur-xl">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Logo - Compact on mobile */}
            <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer" onClick={reset}>
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-1 ring-stone-500/20 shadow-lg shadow-black/30 group-hover:ring-stone-500/30 transition-all">
                  <img
                    src="/sage.png"
                    alt="Sage"
                    className="w-full h-full object-cover object-top scale-150"
                  />
                </div>
              </div>
              <div className="hidden xs:block sm:block">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight">Sage</h1>
                <p className="text-[10px] sm:text-xs text-white/40 -mt-0.5">Ask anything</p>
              </div>
            </div>

            {/* Phase indicator - Desktop only */}
            {hasMessages && mode === "text" && (
              <div className="hidden md:block">
                <PhaseIndicator currentPhase={phase} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mode Toggle - Compact on mobile */}
            <div className="flex items-center bg-white/5 backdrop-blur-sm rounded-full p-0.5 sm:p-1 border border-white/10">
              <button
                onClick={() => setMode("text")}
                className={clsx(
                  "flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300",
                  mode === "text"
                    ? "bg-white text-black shadow-lg"
                    : "text-white/60 hover:text-white"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">Text</span>
              </button>
              <button
                onClick={() => setMode("voice")}
                className={clsx(
                  "flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300",
                  mode === "voice"
                    ? "bg-white text-black shadow-lg"
                    : "text-white/60 hover:text-white"
                )}
              >
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">Voice</span>
              </button>
            </div>

            {/* Model selector - Desktop only */}
            {mode === "text" && (
              <div className="hidden md:block">
                <ModelSelector
                  selectedModelId={modelId}
                  onSelect={setModel}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Auth header - Desktop only */}
            <div className="hidden sm:block">
              <AuthHeader />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 sm:p-2.5 hover:bg-white/5 rounded-xl transition-colors border border-white/10"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
            </button>
          </div>
        </header>

        {/* Messages area */}
        <main className="flex-1 overflow-y-auto">
          {mode === "voice" ? (
            <div className="h-full">
              <VoiceChat
                onConnectionChange={setVoiceConnected}
                onTranscript={(msg) => {
                  console.log("Transcript:", msg);
                }}
                onInsightsChange={setVoiceInsights}
                onTopicChange={setVoiceTopic}
              />
            </div>
          ) : !hasMessages ? (
            <div className="h-full flex flex-col items-center justify-start px-4 pt-12 sm:pt-24 md:pt-32 pb-12 overflow-y-auto">
              <div className="max-w-2xl w-full">
                {/* Hero section - Mobile optimized */}
                <div className="text-center mb-8 sm:mb-12">
                  {/* Sage portrait - Smaller on mobile */}
                  <div className="mb-6 sm:mb-8 flex justify-center">
                    <div className="relative group">
                      {/* Subtle warm glow */}
                      <div className="absolute -inset-4 bg-amber-500/[0.08] rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Sage image in circular frame */}
                      <div className="relative w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] md:w-[180px] md:h-[180px] rounded-full overflow-hidden ring-1 ring-stone-500/20 shadow-2xl shadow-black/40">
                        <img
                          src="/sage.png"
                          alt="Sage"
                          className="w-full h-full object-cover object-top scale-125 -translate-y-2"
                        />
                        {/* Subtle gradient overlay for blending */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/40 via-transparent to-transparent" />
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4 text-white">
                    What&apos;s on your mind?
                  </h2>
                  <p className="text-sm sm:text-lg text-white/50 max-w-md mx-auto leading-relaxed px-4">
                    Ask anything. I&apos;ll help you find the answers you&apos;re looking for.
                  </p>
                </div>

                {/* Example prompts - Touch-friendly */}
                <div className="space-y-2 sm:space-y-3 max-w-lg mx-auto px-2">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/30 mb-3 sm:mb-4 text-center">
                    Start exploring
                  </p>
                  <ExamplePrompt
                    onClick={handleSendMessage}
                    prompt="I'm struggling to decide whether to change careers"
                  />
                  <ExamplePrompt
                    onClick={handleSendMessage}
                    prompt="I feel like I'm not making progress in life"
                  />
                  <ExamplePrompt
                    onClick={handleSendMessage}
                    prompt="I can't seem to maintain good habits"
                  />
                </div>

                {/* Wisdom quote - Hidden on very small screens */}
                <div className="hidden sm:block mt-12 md:mt-16 text-center">
                  <blockquote className="text-white/30 italic text-sm">
                    &ldquo;The only true wisdom is knowing you know nothing.&rdquo;
                  </blockquote>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-4 sm:py-6 px-2 sm:px-4">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLatest={index === messages.length - 1 && isLoading}
                />
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </main>

        {/* Input - only show in text mode */}
        {mode === "text" && (
          <div className="relative pb-safe">
            {/* Gradient fade */}
            <div className="absolute -top-16 sm:-top-20 left-0 right-0 h-16 sm:h-20 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />

            <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 pb-3 sm:pb-6">
              {hasMessages && (
                <div className="flex justify-center mb-2 sm:mb-3">
                  <button
                    onClick={reset}
                    className="btn-sm flex items-center gap-2 px-3 py-1.5 text-xs text-white/40 hover:text-white/60 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    New conversation
                  </button>
                </div>
              )}
              <ChatInput
                onSend={sendMessage}
                disabled={isLoading}
                placeholder={
                  hasMessages
                    ? "Continue the dialogue..."
                    : "Share what's on your mind..."
                }
              />
              <p className="text-center text-[10px] sm:text-xs text-white/20 mt-2 sm:mt-3">
                Sage uses AI to help you discover your own answers
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar
        insights={mode === "voice" && voiceInsights
          ? voiceInsights.keyPoints.map((point, i) => ({
              id: `voice-${i}`,
              content: point,
              turnNumber: i + 1,
              timestamp: new Date()
            }))
          : insights}
        problemStatement={mode === "voice" ? voiceTopic : problemStatement}
        onReset={mode === "voice" ? () => {
          setVoiceInsights(null);
          setVoiceTopic("");
        } : reset}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        voiceSummary={mode === "voice" && voiceInsights ? voiceInsights.summary : undefined}
        voiceReflections={mode === "voice" && voiceInsights ? voiceInsights.reflections : undefined}
      />
    </div>
  );
}

function ExamplePrompt({
  prompt,
  onClick,
}: {
  prompt: string;
  onClick: (message: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(prompt)}
      className="group w-full p-3 sm:p-4 text-left bg-stone-900/30 hover:bg-stone-800/40 active:bg-stone-800/50 border border-stone-700/20 hover:border-stone-600/30 rounded-xl transition-all duration-200 flex items-center gap-3 sm:gap-4"
    >
      <span className="flex-1 text-sm sm:text-base text-white/60 group-hover:text-white/80 transition-colors leading-relaxed">
        {prompt}
      </span>
      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  );
}
