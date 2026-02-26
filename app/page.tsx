"use client";

import { useRef, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu, MessageSquare, Mic, RotateCcw, ChevronRight, Ghost, Loader2 } from "lucide-react";
import { useSocraticChat } from "@/lib/use-chat";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { Sidebar } from "@/components/sidebar";
import { VoiceChat } from "@/components/voice-chat";
import { VoiceOrb, LogoOrb } from "@/components/voice-orb-3d";
import { AuthHeader } from "@/components/auth/auth-header";
import { clsx } from "clsx";

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
    insights,
    problemStatement,
    modelId,
    isLoading,
    isResetting,
    sendMessage,
    setModel,
    reset,
    profileSummary,
    ghostMode,
    toggleGhostMode,
  } = useSocraticChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("text");
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceInsights, setVoiceInsights] = useState<VoiceInsightsData | null>(null);
  const [voiceTopic, setVoiceTopic] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const hasMessages = messages.length > 0;

  const handleSendMessage = (message: string) => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    sendMessage(message);
  };

  return (
    <div className="flex h-screen-safe bg-chamber-900 text-chamber-100 overflow-hidden">
      {/* Grain texture overlay */}
      <div className="grain-overlay" />

      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary ember glow - top left */}
        <div
          className="absolute -top-1/4 -left-1/4 w-[600px] sm:w-[900px] h-[600px] sm:h-[900px] rounded-full animate-ambient"
          style={{
            background: "radial-gradient(circle, rgba(224, 124, 56, 0.08) 0%, rgba(224, 124, 56, 0.02) 50%, transparent 70%)",
          }}
        />
        {/* Secondary gold glow - bottom right */}
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full animate-ambient-slow"
          style={{
            background: "radial-gradient(circle, rgba(196, 149, 106, 0.06) 0%, rgba(196, 149, 106, 0.01) 50%, transparent 70%)",
            animationDelay: "-10s",
          }}
        />
        {/* Subtle center glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(224, 124, 56, 0.03) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gold-400/10 glass">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Ghost Mode Indicator */}
            {ghostMode && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                <Ghost className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-medium text-purple-300 hidden sm:inline">Ghost</span>
              </div>
            )}

            {/* Logo */}
            <div
              className={clsx(
                "flex items-center gap-2 sm:gap-3 group cursor-pointer",
                mounted && "animate-fade-in"
              )}
              onClick={reset}
            >
              <LogoOrb size={32} className="sm:hidden" />
              <LogoOrb size={40} className="hidden sm:block" animated />
              <div className="hidden xs:block sm:block">
                <h1 className="text-base sm:text-lg font-display font-semibold tracking-tight text-chamber-50">
                  Sage
                </h1>
                <p className="text-[10px] sm:text-xs text-chamber-400 -mt-0.5">Ask anything</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mode Toggle */}
            <div className="flex items-center glass rounded-full p-0.5 sm:p-1">
              <button
                onClick={() => setMode("text")}
                className={clsx(
                  "flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300",
                  mode === "text"
                    ? "bg-ember-500 text-white shadow-lg shadow-ember-500/25"
                    : "text-chamber-400 hover:text-chamber-100"
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
                    ? "bg-ember-500 text-white shadow-lg shadow-ember-500/25"
                    : "text-chamber-400 hover:text-chamber-100"
                )}
              >
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">Voice</span>
              </button>
            </div>

            {/* Auth header - Desktop only */}
            <div className="hidden sm:block">
              <AuthHeader />
            </div>

            {/* Sidebar menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 sm:p-2.5 hover:bg-chamber-800/50 rounded-xl transition-colors border border-gold-400/10"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-chamber-400" />
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
                ghostMode={ghostMode}
              />
            </div>
          ) : !hasMessages ? (
            <div className="h-full flex flex-col items-center justify-start px-4 pt-12 sm:pt-20 md:pt-28 pb-12 overflow-y-auto">
              <div className="max-w-2xl w-full">
                {/* Hero section */}
                <div className="text-center mb-10 sm:mb-14">
                  {/* Orb logo with entrance animation */}
                  <div
                    className={clsx(
                      "mb-8 sm:mb-10 flex justify-center",
                      mounted && "animate-scale-in"
                    )}
                  >
                    <VoiceOrb state="idle" size={120} className="sm:hidden" />
                    <VoiceOrb state="idle" size={160} className="hidden sm:block md:hidden" />
                    <VoiceOrb state="idle" size={200} className="hidden md:block" />
                  </div>

                  <h2
                    className={clsx(
                      "font-display text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight mb-4 sm:mb-5 text-chamber-50 text-balance opacity-0",
                      mounted && "animate-fade-up stagger-2"
                    )}
                  >
                    What&apos;s on your mind?
                  </h2>
                  <p
                    className={clsx(
                      "text-sm sm:text-lg text-chamber-400 max-w-md mx-auto leading-relaxed px-4 text-pretty opacity-0",
                      mounted && "animate-fade-up stagger-3"
                    )}
                  >
                    Share your thoughts. Together, we&apos;ll discover the answers you seek.
                  </p>
                </div>

                {/* Example prompts */}
                <div
                  className={clsx(
                    "space-y-2.5 sm:space-y-3 max-w-lg mx-auto px-2 opacity-0",
                    mounted && "animate-fade-up stagger-4"
                  )}
                >
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-chamber-500 mb-4 sm:mb-5 text-center font-medium">
                    Begin your inquiry
                  </p>
                  <ExamplePrompt
                    onClick={handleSendMessage}
                    prompt="I'm struggling to decide whether to change careers"
                    delay={0}
                  />
                  <ExamplePrompt
                    onClick={handleSendMessage}
                    prompt="I feel like I'm not making progress in life"
                    delay={100}
                  />
                  <ExamplePrompt
                    onClick={handleSendMessage}
                    prompt="I can't seem to maintain good habits"
                    delay={200}
                  />
                </div>

                {/* Wisdom quote */}
                <div
                  className={clsx(
                    "hidden sm:block mt-14 md:mt-20 text-center opacity-0",
                    mounted && "animate-fade-in stagger-6"
                  )}
                >
                  <blockquote className="font-display text-lg text-chamber-500 italic">
                    &ldquo;The only true wisdom is knowing you know nothing.&rdquo;
                  </blockquote>
                  <cite className="text-xs text-chamber-600 mt-2 block not-italic tracking-wide">
                    — Socrates
                  </cite>
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
              {/* Thinking indicator: shows after user sends message, before assistant response starts */}
              {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                <div className="flex gap-3 sm:gap-4 px-3 sm:px-4 py-5 sm:py-6 bg-chamber-800/20">
                  <LogoOrb size={28} className="sm:hidden" />
                  <LogoOrb size={32} className="hidden sm:block" animated />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-medium text-xs sm:text-sm text-ember-500">Sage</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-chamber-400">
                      <span className="inline-flex gap-1.5 items-center" role="status" aria-label="Sage is thinking">
                        <span className="size-1.5 sm:size-2 bg-ember-500/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="size-1.5 sm:size-2 bg-ember-500/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="size-1.5 sm:size-2 bg-ember-500/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </main>

        {/* Input - only show in text mode */}
        {mode === "text" && (
          <div className="relative pb-safe">
            {/* Gradient fade */}
            <div className="absolute -top-20 sm:-top-24 left-0 right-0 h-20 sm:h-24 bg-gradient-to-t from-chamber-900 to-transparent pointer-events-none" />

            <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 pb-3 sm:pb-6">
              {hasMessages && (
                <div className="flex justify-center mb-2 sm:mb-3">
                  <button
                    onClick={reset}
                    disabled={isResetting}
                    className="btn-sm flex items-center gap-2 px-3 py-1.5 text-xs text-chamber-500 hover:text-chamber-300 hover:bg-chamber-800/50 rounded-full transition-colors disabled:opacity-50"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving insights...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        New conversation
                      </>
                    )}
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
              <p className="text-center text-[10px] sm:text-xs text-chamber-600 mt-2 sm:mt-3">
                Sage uses AI to guide you toward your own answers
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
        user={session?.user}
        profileSummary={profileSummary}
        ghostMode={ghostMode}
        onToggleGhostMode={toggleGhostMode}
        isResetting={isResetting}
      />
    </div>
  );
}

function ExamplePrompt({
  prompt,
  onClick,
  delay = 0,
}: {
  prompt: string;
  onClick: (message: string) => void;
  delay?: number;
}) {
  return (
    <button
      onClick={() => onClick(prompt)}
      className="group w-full p-3.5 sm:p-4 text-left glass hover:bg-chamber-800/60 active:bg-chamber-800/80 rounded-xl transition-all duration-300 flex items-center gap-3 sm:gap-4 hover:border-gold-400/20"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative element */}
      <div className="w-1.5 h-1.5 rounded-full bg-ember-500/60 group-hover:bg-ember-500 group-hover:shadow-[0_0_8px_rgba(224,124,56,0.5)] transition-all duration-300 flex-shrink-0" />
      <span className="flex-1 text-sm sm:text-base text-chamber-300 group-hover:text-chamber-100 transition-colors leading-relaxed">
        {prompt}
      </span>
      <ChevronRight className="w-4 h-4 text-chamber-600 group-hover:text-ember-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  );
}
