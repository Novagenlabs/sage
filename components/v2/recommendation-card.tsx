"use client";

// Generative-UI card that renders a Sage resource recommendation.
// Used in three places that share the same shape:
//   1. Post-session, on the chat screens (text/voice/video) right after the
//      user taps finish. Streamed in via /api/recommendations/stream.
//   2. Persistently, on the entry-detail page. Loaded from
//      /api/conversations/[id] which now joins the Recommendation row.
//
// Same props in both cases — the surface decides how to wrap it.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  Play,
  X,
  BookOpen,
  Headphones,
  Mic,
  Video as VideoIcon,
  GraduationCap,
  FileText,
} from "lucide-react";
import type { RecommendationPayload } from "@/lib/recommendations/types";
import { ResourcePlayer } from "@/components/v2/resource-player";

type ResourceType = RecommendationPayload["resource"]["type"];

const TYPE_LABEL: Record<ResourceType, string> = {
  book: "book",
  article: "article",
  lecture: "lecture",
  podcast: "podcast",
  video: "video",
  audiobook: "audiobook",
};

function TypeIcon({ type }: { type: ResourceType }) {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "book":
      return <BookOpen className={cls} />;
    case "audiobook":
      return <Headphones className={cls} />;
    case "podcast":
      return <Mic className={cls} />;
    case "video":
      return <VideoIcon className={cls} />;
    case "lecture":
      return <GraduationCap className={cls} />;
    case "article":
      return <FileText className={cls} />;
  }
}

export interface RecommendationCardProps {
  recommendation: RecommendationPayload;
  /** Called after feedback is recorded so the parent can advance the flow. */
  onDismiss?: () => void;
  /** Compact mode = entry-detail render (no big "Sage suggests" header). */
  variant?: "post-session" | "entry";
}

export function RecommendationCard({
  recommendation,
  onDismiss,
  variant = "post-session",
}: RecommendationCardProps) {
  const [feedback, setFeedback] = useState<RecommendationPayload["feedback"]>(
    recommendation.feedback ?? null
  );
  const [submitting, setSubmitting] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const { resource, reason, recommendationId } = recommendation;

  const submitFeedback = async (value: "helpful" | "not_for_me") => {
    if (submitting || feedback) return;
    setSubmitting(true);
    setFeedback(value);
    try {
      await fetch(`/api/recommendations/${recommendationId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: value }),
      });
    } catch {
      // Best-effort. The optimistic state stays so the user gets immediate
      // closure; if the network call fails the next page load will reflect
      // the server's truth.
    } finally {
      setSubmitting(false);
      // Give the user a moment to see the thanks state, then dismiss.
      if (onDismiss) {
        setTimeout(onDismiss, 1100);
      }
    }
  };

  const trackClick = () => {
    // Fire-and-forget; never block the open.
    fetch(`/api/recommendations/${recommendationId}/click`, {
      method: "POST",
    }).catch(() => {});
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="v2-card relative w-full max-w-md mx-auto"
    >
      {variant === "post-session" && (
        <p className="text-[10px] uppercase tracking-[0.22em] text-ember-400 mb-3">
          sage suggests
        </p>
      )}

      <div className="flex items-center gap-2 text-[11px] text-chamber-400 lowercase mb-1">
        <span className="inline-flex items-center gap-1">
          <TypeIcon type={resource.type} />
          {TYPE_LABEL[resource.type]}
        </span>
        {resource.author && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate">{resource.author}</span>
          </>
        )}
      </div>

      <h3 className="text-lg font-display text-chamber-50 mb-2 leading-snug">
        {resource.title}
      </h3>

      <p className="text-sm text-chamber-300 leading-relaxed mb-3">
        {resource.blurb}
      </p>

      <div className="rounded-2xl bg-chamber-900/40 border border-chamber-800 p-3 mb-4">
        <p className="text-[10px] uppercase tracking-widest text-chamber-500 mb-1">
          why
        </p>
        <p className="text-sm text-chamber-200 leading-relaxed italic">
          {reason}
        </p>
      </div>

      <button
        onClick={() => {
          trackClick();
          setPlayerOpen(true);
        }}
        className="inline-flex items-center gap-1.5 text-sm text-ember-300 hover:text-ember-200 lowercase mb-4"
      >
        <Play className="h-3.5 w-3.5" />
        play in app
      </button>

      <AnimatePresence>
        {playerOpen && (
          <PlayerSheet
            resource={resource}
            onClose={() => setPlayerOpen(false)}
            onClickOpen={trackClick}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {feedback ? (
          <motion.p
            key="thanks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-chamber-500 lowercase"
          >
            {feedback === "helpful"
              ? "noted — thanks for the signal."
              : "got it — won't suggest similar."}
          </motion.p>
        ) : (
          <motion.div
            key="buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <button
              onClick={() => submitFeedback("helpful")}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-ember-500/15 border border-ember-500/30 text-ember-200 px-3.5 py-1.5 text-xs lowercase hover:bg-ember-500/25 transition-colors disabled:opacity-50"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              helpful
            </button>
            <button
              onClick={() => submitFeedback("not_for_me")}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-chamber-800/70 border border-chamber-700 text-chamber-300 px-3.5 py-1.5 text-xs lowercase hover:bg-chamber-800 transition-colors disabled:opacity-50"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              not for me
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-auto text-[11px] text-chamber-500 hover:text-chamber-300 lowercase"
              >
                skip
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PlayerSheet({
  resource,
  onClose,
  onClickOpen,
}: {
  resource: RecommendationPayload["resource"];
  onClose: () => void;
  onClickOpen: () => void;
}) {
  // Lock body scroll while the sheet is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-chamber-900/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={resource.title}
        initial={{ y: "100%", opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 36 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-chamber-900 border-t border-chamber-800 rounded-t-3xl px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4 max-h-[92vh] overflow-y-auto lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[560px] lg:max-h-[80vh] lg:rounded-3xl lg:border lg:px-8 lg:pb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-chamber-500 uppercase tracking-widest">
            sage suggests
          </span>
          <button
            onClick={onClose}
            aria-label="close"
            className="h-8 w-8 rounded-full bg-chamber-800 flex items-center justify-center text-chamber-300 hover:bg-chamber-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ResourcePlayer resource={resource} onClickOpen={onClickOpen} />
      </motion.div>
    </>
  );
}
