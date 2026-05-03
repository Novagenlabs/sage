"use client";

import Link from "next/link";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { X, ArrowUp, Mic, Plus, AudioLines, Loader2, RotateCcw } from "lucide-react";
import { useSocraticChat } from "@/lib/use-chat";
import { useRecommendationStream } from "@/lib/use-recommendation-stream";
import { RecommendationCard } from "@/components/v2/recommendation-card";
import { motion, AnimatePresence } from "framer-motion";

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const seedPrompt = params.get("prompt");
  const seedTitle = params.get("title");
  const wantFresh = params.get("fresh") === "1";

  const {
    messages,
    isLoading,
    isResetting,
    sendMessage,
    reset,
    isHydrated,
    problemStatement,
    profileSummary,
    conversationId,
  } = useSocraticChat();

  // Generative-UI recommendation stream + ending overlay state. When the
  // user taps "finish & reflect" we POST the transcript via reset() (which
  // calls /api/conversation/end), then kick the matcher and either show a
  // card or navigate straight to /entries/active.
  const recommendationStream = useRecommendationStream();
  const [endingPhase, setEndingPhase] = useState<
    "idle" | "saving" | "matching" | "card" | "done"
  >("idle");

  const [tab, setTab] = useState<"transcript" | "analysis">("transcript");
  const [draft, setDraft] = useState("");
  const seededRef = useRef(false);
  const freshHandledRef = useRef(false);
  // When we arrived via ?fresh=1, the hook has already hydrated stale state
  // from localStorage. Keep the loader visible until reset() finishes so the
  // user never sees the previous conversation flash.
  const [freshDone, setFreshDone] = useState(!wantFresh);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth gate
  useEffect(() => {
    if (status === "unauthenticated") {
      const next = encodeURIComponent(
        seedPrompt
          ? `/chat/text?prompt=${encodeURIComponent(seedPrompt)}${seedTitle ? `&title=${encodeURIComponent(seedTitle)}` : ""}`
          : "/chat/text"
      );
      router.replace(`/auth/signin?next=${next}`);
    }
  }, [status, router, seedPrompt, seedTitle]);

  // ?fresh=1 (from home's "type"/"new" links and explore cards) — end the
  // previous session, then strip the flag from the URL so a refresh doesn't
  // double-reset. While reset() is in flight we keep the loader on so the
  // user never sees the previous conversation rendered.
  useEffect(() => {
    if (
      !freshHandledRef.current &&
      wantFresh &&
      isHydrated &&
      status === "authenticated"
    ) {
      freshHandledRef.current = true;
      (async () => {
        await reset();
        // Preserve seed prompt/title in the URL after consuming `fresh`.
        const next = new URLSearchParams();
        if (seedPrompt) next.set("prompt", seedPrompt);
        if (seedTitle) next.set("title", seedTitle);
        const qs = next.toString();
        router.replace(`/chat/text${qs ? `?${qs}` : ""}`, { scroll: false });
        setFreshDone(true);
      })();
    }
  }, [
    wantFresh,
    isHydrated,
    status,
    reset,
    router,
    seedPrompt,
    seedTitle,
  ]);

  // Auto-send seed prompt as first user message. Wait until the optional
  // fresh-reset has finished (otherwise we'd send into the old conversation).
  useEffect(() => {
    if (
      !seededRef.current &&
      seedPrompt &&
      isHydrated &&
      status === "authenticated" &&
      messages.length === 0 &&
      !isLoading &&
      !isResetting &&
      (!wantFresh || freshHandledRef.current)
    ) {
      seededRef.current = true;
      sendMessage(seedPrompt);
    }
  }, [
    seedPrompt,
    isHydrated,
    status,
    messages.length,
    isLoading,
    isResetting,
    wantFresh,
    sendMessage,
  ]);

  // Autoscroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const send = () => {
    const t = draft.trim();
    if (!t || isLoading) return;
    sendMessage(t);
    setDraft("");
    inputRef.current?.focus();
  };

  // Refocus the input once a streamed reply finishes so the user can keep typing
  // without tapping back into the field.
  useEffect(() => {
    if (!isLoading && status === "authenticated" && freshDone) {
      inputRef.current?.focus();
    }
  }, [isLoading, status, freshDone]);

  // "finish & reflect" — closes the conversation, runs the summariser, then
  // streams the recommendation card. Mirrors voice/video's post-session flow.
  const finishAndReflect = async () => {
    if (messages.length === 0 || endingPhase !== "idle") return;
    // Capture the id before reset() clears it, so the stream still has it.
    const id = conversationId;
    setEndingPhase("saving");
    await reset();
    if (!id) {
      // Ghost mode or no row was created — skip the matcher entirely.
      router.push("/home");
      return;
    }
    setEndingPhase("matching");
    recommendationStream.start({ conversationId: id });
  };

  // When the stream resolves, decide whether to show the card or navigate.
  // After a session, route home — the entry exists and the summariser is
  // running async; sending the user back where they started is the natural
  // rhythm. They can browse entries from the tab bar when they want to.
  useEffect(() => {
    if (endingPhase !== "matching") return;
    if (recommendationStream.recommendation) {
      setEndingPhase("card");
      return;
    }
    if (
      recommendationStream.phase === "done" ||
      recommendationStream.phase === "error"
    ) {
      router.push("/home");
    }
  }, [
    endingPhase,
    recommendationStream.phase,
    recommendationStream.recommendation,
    router,
  ]);

  if (status !== "authenticated" || !isHydrated || !freshDone || isResetting) {
    return (
      <div className="v2-screen bg-chamber-900 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
      </div>
    );
  }

  const headerTitle =
    seedTitle ||
    problemStatement ||
    (messages.find((m) => m.role === "user")?.content.slice(0, 40) ?? "new conversation");

  return (
    <div className="v2-screen bg-chamber-900 px-0 lg:max-w-3xl lg:mx-auto lg:px-4 lg:pt-8 relative">
      {/* Post-session overlay — shown while we summarize, match a resource,
          and (optionally) render the recommendation card before navigating. */}
      <AnimatePresence>
        {endingPhase !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-chamber-900/95 backdrop-blur-sm flex items-center justify-center px-6"
          >
            {endingPhase === "card" && recommendationStream.recommendation ? (
              <RecommendationCard
                recommendation={recommendationStream.recommendation}
                onDismiss={() => router.push("/home")}
                variant="post-session"
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-chamber-300" />
                <p className="text-sm text-chamber-300 lowercase tracking-wide">
                  saving your session...
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-4 lg:px-2">
        {messages.length > 0 ? (
          <button
            onClick={finishAndReflect}
            disabled={endingPhase !== "idle"}
            className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center text-chamber-200 disabled:opacity-50 hover:bg-chamber-700"
            aria-label="finish and reflect"
            title="finish & reflect"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <Link
            href="/home"
            className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center"
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </Link>
        )}
        <div className="bg-chamber-800/70 rounded-full p-0.5 flex">
          <button
            onClick={() => setTab("transcript")}
            className={`px-4 py-1.5 rounded-full text-xs lowercase ${
              tab === "transcript" ? "bg-chamber-50 text-chamber-900" : "text-chamber-300"
            }`}
          >
            transcript
          </button>
          <button
            onClick={() => setTab("analysis")}
            className={`px-4 py-1.5 rounded-full text-xs lowercase ${
              tab === "analysis" ? "bg-chamber-50 text-chamber-900" : "text-chamber-300"
            }`}
          >
            analysis
          </button>
        </div>
        <button
          onClick={async () => {
            if (messages.length === 0) return;
            await reset();
          }}
          disabled={isResetting || messages.length === 0}
          className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center text-chamber-200 disabled:opacity-30 hover:bg-chamber-700"
          aria-label="new conversation"
          title="new conversation"
        >
          {isResetting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Title */}
      <div className="px-6 mb-2 lg:px-2">
        <h1 className="font-display text-2xl tracking-tight lowercase truncate lg:text-4xl">
          {headerTitle}
        </h1>
        <p className="text-xs text-chamber-500 mt-1 lowercase">
          {messages.length === 0 ? "tap to begin" : `${messages.length} messages`}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 pb-2 lg:px-2">
        {tab === "analysis" ? (
          <div className="space-y-4 pt-4">
            {profileSummary ? (
              <div className="v2-card">
                <p className="text-xs uppercase tracking-widest text-ember-400 mb-2">
                  what sage knows
                </p>
                <p className="text-sm text-chamber-200 leading-relaxed whitespace-pre-wrap">
                  {profileSummary}
                </p>
              </div>
            ) : (
              <p className="text-sm text-chamber-500 py-12 text-center lowercase">
                analysis appears after a few exchanges.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {seedTitle && messages.length > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full bg-ember-500/10 border border-ember-500/30 px-3 py-1.5 text-xs text-ember-300 lowercase">
                <span className="h-1.5 w-1.5 rounded-full bg-ember-400" />
                context loaded · {seedTitle}
              </div>
            )}
            {messages.length === 0 && !isLoading && !seedPrompt && (
              <div className="pt-12 space-y-2">
                <p className="text-sm text-chamber-400 lowercase">
                  what&apos;s on your mind?
                </p>
                {[
                  "i'm stuck on a decision i keep avoiding",
                  "i don't know what i actually want",
                  "i feel off and i can't name why",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left rounded-2xl bg-chamber-800/40 border border-chamber-800 px-4 py-3 text-sm text-chamber-200 hover:bg-chamber-800/70"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="flex gap-2">
                {m.role === "assistant" && (
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-ember-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  {m.role === "user" && (
                    <div className="text-xs text-chamber-500 mb-1 lowercase">you</div>
                  )}
                  <p className="text-[0.95rem] leading-relaxed text-chamber-100 whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-ember-500 flex-shrink-0" />
                <motion.div
                  className="flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Dot delay={0} />
                  <Dot delay={150} />
                  <Dot delay={300} />
                </motion.div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:px-2 lg:pb-6">
        <div className="flex items-center gap-2 bg-chamber-800/70 rounded-full px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="tap to type..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-chamber-100 placeholder:text-chamber-500 focus:outline-none py-2"
            style={{ fontSize: 16 }}
          />
          <button className="h-8 w-8 rounded-full bg-chamber-700 flex items-center justify-center">
            <Mic className="h-4 w-4 text-chamber-100" />
          </button>
          {draft.trim() ? (
            <button
              onClick={send}
              disabled={isLoading}
              className="h-8 w-8 rounded-full bg-ember-500 text-white flex items-center justify-center disabled:opacity-50"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/chat/voice"
              className="h-8 w-8 rounded-full bg-chamber-50 text-chamber-900 flex items-center justify-center"
            >
              <AudioLines className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="h-2 w-2 rounded-full bg-ember-500/70 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

export default function TextChatPage() {
  return (
    <Suspense fallback={<div className="v2-screen bg-chamber-900" />}>
      <Inner />
    </Suspense>
  );
}
