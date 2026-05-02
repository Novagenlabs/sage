"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Copy, Share2, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";

type Stats = {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  qualifiedCount: number;
  totalCreditsEarned: number;
};

export default function ReferralsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?next=/referrals");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/referrals/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Stats | null) => setStats(data))
      .catch(() => setStats(null));
  }, [status]);

  const copy = async () => {
    if (!stats?.referralLink) return;
    try {
      await navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    if (!stats?.referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "join me on sage",
          text: "give yourself a place to actually think — try sage with me.",
          url: stats.referralLink,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  if (status !== "authenticated" || !stats) {
    return (
      <div className="v2-screen bg-chamber-900 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
      </div>
    );
  }

  return (
    <div className="v2-screen bg-chamber-900">
      <Link
        href="/profile"
        className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      <h1 className="v2-h1 mb-2">give 120, get 120</h1>
      <p className="v2-sub mb-10">
        invite a friend. when they have their first real session, you both get
        120 free credits.
      </p>

      {/* Hero illustration */}
      <div className="flex justify-center mb-10">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 160 160" className="w-44" aria-hidden>
            <rect x="30" y="60" width="100" height="80" rx="12" fill="#e07c38" />
            <rect x="30" y="58" width="100" height="20" rx="4" fill="#c4956a" />
            <rect x="74" y="58" width="12" height="82" fill="#08080c" />
            <path d="M80 58 Q 60 40 50 50 Q 50 65 80 60" fill="#f5b8d6" />
            <path d="M80 58 Q 100 40 110 50 Q 110 65 80 60" fill="#b48af2" />
          </svg>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="rounded-2xl bg-chamber-800/40 border border-chamber-800 p-4 text-center">
          <p className="font-display text-3xl text-ember-400">
            {stats.totalReferred}
          </p>
          <p className="text-xs text-chamber-400 lowercase mt-1">
            friends invited
            {stats.qualifiedCount > 0 ? (
              <span className="block text-[10px] text-chamber-600">
                · {stats.qualifiedCount} qualified
              </span>
            ) : null}
          </p>
        </div>
        <div className="rounded-2xl bg-chamber-800/40 border border-chamber-800 p-4 text-center">
          <p className="font-display text-3xl text-bloom-400">
            {stats.totalCreditsEarned}
          </p>
          <p className="text-xs text-chamber-400 lowercase mt-1">
            credits earned
          </p>
        </div>
      </div>

      {/* Link box */}
      <div className="rounded-2xl bg-chamber-800/40 border border-chamber-800 p-4 flex items-center gap-3 mb-6">
        <span className="flex-1 text-sm text-chamber-200 truncate">
          {stats.referralLink}
        </span>
        <button
          onClick={copy}
          className="h-9 w-9 rounded-full bg-chamber-50 text-chamber-900 flex items-center justify-center"
          aria-label="copy link"
        >
          {copied ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex-1" />

      <button onClick={share} className="v2-btn v2-btn-primary w-full">
        <Share2 className="h-4 w-4" />
        share invite
      </button>
    </div>
  );
}
