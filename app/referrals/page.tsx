"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  Share2,
  Download,
} from "lucide-react";
import { toPng } from "html-to-image";
import { ReferralCard } from "@/components/referral-card";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  qualifiedCount: number;
  totalCreditsEarned: number;
  recentReferrals: Array<{
    id: string;
    status: string;
    creditsPaid: number;
    createdAt: string;
    qualifiedAt: string | null;
  }>;
}

export default function ReferralsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(196,149,106,0.4)" }} />
        </div>
      }
    >
      <ReferralsContent />
    </Suspense>
  );
}

function ReferralsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "sage-invite.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate image:", err);
    }
  };

  const shareCard = async () => {
    if (!cardRef.current || !navigator.share) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "sage-invite.png", { type: "image/png" });
      await navigator.share({
        title: "Join me on Sage",
        text: shareText,
        files: [file],
        url: data?.referralLink,
      });
    } catch (err) {
      // User cancelled or share failed — fall back to download
      if ((err as Error).name !== "AbortError") {
        downloadCard();
      }
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/referrals/stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchStats();
    }
  }, [status, fetchStats]);

  const handleCopy = async () => {
    if (!data?.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
    } catch {
      const input = document.createElement("input");
      input.value = data.referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText =
    "I've been using Sage — an AI that helps you think clearly through voice conversations. Try it with my link and get 2 bonus minutes free!";

  const handleShare = (platform: string) => {
    if (!data?.referralLink) return;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + " " + data.referralLink)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(data.referralLink)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.referralLink)}`,
    };
    const url = urls[platform];
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(196,149,106,0.4)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c]" style={{ color: "#e8e4de" }}>
      {/* Single ambient glow — restrained */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(224,124,56,0.04) 0%, transparent 70%)" }}
        />
      </div>

      {/* Nav */}
      <nav className="relative z-10 max-w-2xl mx-auto px-6 pt-8 sm:pt-12">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "rgba(196,149,106,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </nav>

      <div className="relative z-10 max-w-2xl mx-auto px-6">

        {/* ====== HERO ====== */}
        <section className="pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
          <p
            className="text-[11px] uppercase tracking-[0.25em] mb-5"
            style={{ color: "rgba(196,149,106,0.4)" }}
          >
            Referrals
          </p>
          <h1
            className="font-display text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.05]"
            style={{ color: "rgba(232,228,222,0.95)" }}
          >
            Give 2 minutes.
            <br />
            <span style={{ color: "#e07c38" }}>Get 2 minutes.</span>
          </h1>
          <p
            className="mt-5 sm:mt-6 text-base sm:text-lg leading-relaxed max-w-md mx-auto"
            style={{ color: "rgba(196,149,106,0.45)" }}
          >
            Share Sage with someone who could use a better conversation.
            You both get 120 credits.
          </p>
        </section>

        {/* ====== SHARE CARD ====== */}
        {data && (
          <section className="pb-16 sm:pb-20">
            <div className="flex justify-center overflow-x-auto -mx-6 px-6">
              <ReferralCard
                ref={cardRef}
                userName={session?.user?.name || ""}
                referralCode={data.referralCode}
              />
            </div>

            {/* Card actions */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={downloadCard}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  background: "rgba(224,124,56,0.1)",
                  color: "#e07c38",
                  border: "1px solid rgba(224,124,56,0.18)",
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Save image
              </button>
              {canNativeShare && (
                <button
                  onClick={shareCard}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
                  style={{
                    background: "rgba(196,149,106,0.08)",
                    color: "rgba(196,149,106,0.6)",
                    border: "1px solid rgba(196,149,106,0.12)",
                  }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              )}
            </div>
          </section>
        )}

        {/* Hairline */}
        <div style={{ height: 1, background: "rgba(196,149,106,0.08)" }} />

        {/* ====== YOUR LINK ====== */}
        <section className="py-12 sm:py-16">
          <p
            className="text-[11px] uppercase tracking-[0.25em] mb-6"
            style={{ color: "rgba(196,149,106,0.35)" }}
          >
            Your link
          </p>

          <div className="flex items-center gap-3">
            <p
              className="flex-1 text-sm sm:text-base truncate font-mono"
              style={{ color: "rgba(232,228,222,0.5)" }}
            >
              {data?.referralLink || "Loading..."}
            </p>
            <button
              onClick={handleCopy}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
              style={{
                background: copied ? "rgba(34,197,94,0.15)" : "rgba(224,124,56,0.12)",
                color: copied ? "#4ade80" : "#e07c38",
                border: `1px solid ${copied ? "rgba(34,197,94,0.2)" : "rgba(224,124,56,0.2)"}`,
              }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Share row */}
          <div className="flex items-center gap-3 mt-6">
            <Share2 className="w-3.5 h-3.5" style={{ color: "rgba(196,149,106,0.25)" }} />
            {[
              { label: "WhatsApp", key: "whatsapp", accent: "#25d366" },
              { label: "Twitter", key: "twitter", accent: undefined },
              { label: "LinkedIn", key: "linkedin", accent: undefined },
            ].map(({ label, key, accent }) => (
              <button
                key={key}
                onClick={() => handleShare(key)}
                className="text-xs font-medium transition-colors duration-200 hover:opacity-80"
                style={{ color: accent || "rgba(196,149,106,0.4)" }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Hairline */}
        <div style={{ height: 1, background: "rgba(196,149,106,0.08)" }} />

        {/* ====== HOW IT WORKS ====== */}
        <section className="py-12 sm:py-16">
          <p
            className="text-[11px] uppercase tracking-[0.25em] mb-10"
            style={{ color: "rgba(196,149,106,0.35)" }}
          >
            How it works
          </p>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
            {[
              { step: "01", title: "Share", body: "Send your link to a friend via WhatsApp, text, or social media." },
              { step: "02", title: "They join", body: "They sign up and get 120 bonus credits — enough for 2 minutes of voice." },
              { step: "03", title: "You earn", body: "Once they have a real conversation, you get 120 credits too." },
            ].map(({ step, title, body }) => (
              <div key={step}>
                <p
                  className="text-[10px] font-mono tracking-wider mb-2"
                  style={{ color: "rgba(224,124,56,0.4)" }}
                >
                  {step}
                </p>
                <p
                  className="font-display text-lg font-medium mb-1.5"
                  style={{ color: "rgba(232,228,222,0.85)" }}
                >
                  {title}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "rgba(196,149,106,0.4)" }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Hairline */}
        <div style={{ height: 1, background: "rgba(196,149,106,0.08)" }} />

        {/* ====== STATS ====== */}
        <section className="py-12 sm:py-16">
          <div className="grid grid-cols-3 gap-6 sm:gap-8">
            {[
              { value: data?.totalReferred ?? 0, label: "Invited" },
              { value: data?.qualifiedCount ?? 0, label: "Qualified" },
              { value: (data?.totalCreditsEarned ?? 0).toLocaleString(), label: "Credits earned" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center sm:text-left">
                <p
                  className="font-display text-3xl sm:text-4xl font-medium"
                  style={{ color: "rgba(232,228,222,0.85)" }}
                >
                  {value}
                </p>
                <p
                  className="text-[11px] uppercase tracking-[0.15em] mt-1"
                  style={{ color: "rgba(196,149,106,0.35)" }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ====== RECENT REFERRALS ====== */}
        {data?.recentReferrals && data.recentReferrals.length > 0 && (
          <>
            <div style={{ height: 1, background: "rgba(196,149,106,0.08)" }} />

            <section className="py-12 sm:py-16">
              <p
                className="text-[11px] uppercase tracking-[0.25em] mb-8"
                style={{ color: "rgba(196,149,106,0.35)" }}
              >
                Activity
              </p>

              <div className="space-y-0">
                {data.recentReferrals.map((ref, i) => (
                  <div key={ref.id}>
                    {i > 0 && (
                      <div style={{ height: 1, background: "rgba(196,149,106,0.06)" }} />
                    )}
                    <div className="flex items-center justify-between py-4">
                      <div>
                        <p
                          className="text-sm"
                          style={{ color: "rgba(232,228,222,0.65)" }}
                        >
                          Referral
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "rgba(196,149,106,0.3)" }}
                        >
                          {new Date(ref.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: ref.status === "qualified" ? "#4ade80" : "rgba(196,149,106,0.35)",
                        }}
                      >
                        {ref.status === "qualified"
                          ? `+${ref.creditsPaid}`
                          : "Pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Footer note */}
        <div className="pb-12 sm:pb-16 pt-4">
          <p
            className="text-xs"
            style={{ color: "rgba(196,149,106,0.2)" }}
          >
            Maximum 20 qualified referrals. Credits are non-transferable.
          </p>
        </div>
      </div>
    </div>
  );
}
