"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Video as VideoIcon, X, AlertTriangle } from "lucide-react";
import { VideoChat } from "@/components/v2/video-chat";

const BETA_ACK_KEY = "sage-video-beta-ack";

export default function VideoChatPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  // Show the beta warning until the user explicitly acknowledges it. We
  // store the ack in localStorage so they aren't nagged on every visit.
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?next=/chat/video");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      const acked = localStorage.getItem(BETA_ACK_KEY);
      if (acked !== "1") setShowWarning(true);
    } catch {
      setShowWarning(true);
    }
  }, [status]);

  const acknowledge = () => {
    try {
      localStorage.setItem(BETA_ACK_KEY, "1");
    } catch {
      /* ignore quota */
    }
    setShowWarning(false);
  };

  if (status !== "authenticated") {
    return (
      <div className="min-h-[100dvh] bg-chamber-900 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
      </div>
    );
  }

  const credits = (session?.user as { credits?: number })?.credits ?? 0;

  return (
    <>
      <VideoChat
        userCredits={credits}
        onClose={(conversationId) =>
          router.push(
            conversationId
              ? `/entries/active?id=${conversationId}`
              : "/entries"
          )
        }
        onCreditsUpdate={() => update()}
      />

      <AnimatePresence>
        {showWarning && (
          <BetaWarning onAccept={acknowledge} onBack={() => router.push("/home")} />
        )}
      </AnimatePresence>
    </>
  );
}

function BetaWarning({
  onAccept,
  onBack,
}: {
  onAccept: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] bg-chamber-900/85 backdrop-blur-md"
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="video is in beta"
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed inset-x-0 bottom-0 z-[70] bg-chamber-900 border-t border-chamber-800 rounded-t-3xl px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[440px] lg:rounded-3xl lg:border lg:px-8 lg:pb-8"
      >
        <div className="flex items-start justify-between mb-5">
          <div className="inline-flex items-center gap-2">
            <span className="h-9 w-9 rounded-full bg-ember-500/15 ring-1 ring-ember-500/30 flex items-center justify-center text-ember-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <span className="text-xs uppercase tracking-[0.22em] text-ember-400">
              video · beta
            </span>
          </div>
          <button
            onClick={onBack}
            aria-label="back home"
            className="h-8 w-8 rounded-full bg-chamber-800 flex items-center justify-center text-chamber-300 hover:bg-chamber-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="font-display text-2xl text-chamber-50 leading-snug mb-3">
          a heads-up before you start
        </h2>
        <p className="text-sm text-chamber-300 leading-relaxed mb-3">
          video sessions are still a work in progress. the avatar may pause,
          re-buffer, or feel less responsive than voice. it'll improve.
        </p>
        <p className="text-sm text-chamber-300 leading-relaxed mb-6">
          if you want the smoothest sage experience right now, voice is
          steadier. you can come back to video any time.
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <Link
            href="/chat/voice"
            className="v2-btn v2-btn-ghost flex-1 justify-center text-sm"
          >
            <VideoIcon className="h-4 w-4 hidden sm:inline" />
            switch to voice
          </Link>
          <button
            onClick={onAccept}
            className="v2-btn v2-btn-primary flex-1 justify-center text-sm"
          >
            got it · continue
          </button>
        </div>
      </motion.div>
    </>
  );
}
