"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { CREDIT_PACKAGES, type CreditPackage, formatNaira as formatNairaUtil } from "@/lib/paystack";

const formatNaira = formatNairaUtil;

function formatVoiceTime(credits: number): string {
  const totalSeconds = credits;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

const PACKAGE_META: Record<string, { tag: string; tagStyle: "light" | "dark"; features: string[] }> = {
  starter: {
    tag: "Starter",
    tagStyle: "light",
    features: [
      "200 credits",
      "~3 min voice",
      "Chat included",
      "Email support",
    ],
  },
  plus: {
    tag: "Popular",
    tagStyle: "light",
    features: [
      "1,000 credits",
      "~16 min voice",
      "Chat included",
      "Priority support",
      "Session insights",
    ],
  },
  pro: {
    tag: "Best Value",
    tagStyle: "dark",
    features: [
      "3,000 credits",
      "~50 min voice",
      "Chat included",
      "Priority support",
      "Session insights",
      "Profile memory",
    ],
  },
};

function LightCheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="8" className="fill-neutral-900" />
      <path
        d="M5.5 8.5L7 10L11 6"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DarkCheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7.5" className="stroke-neutral-500" />
      <path
        d="M5.5 8.5L7 10L11 6"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CreditsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
        </div>
      }
    >
      <CreditsContent />
    </Suspense>
  );
}

function CreditsContent() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [credits, setCredits] = useState<number | null>(null);
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    added?: number;
  } | null>(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.credits !== undefined) {
      setCredits(session.user.credits);
    }
  }, [session]);

  // Auto-verify on callback redirect — runs once per reference
  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference || status !== "authenticated" || verifiedRef.current) return;
    verifiedRef.current = true;

    // Clear reference from URL immediately
    window.history.replaceState({}, "", "/credits");

    (async () => {
      setVerifying(true);
      setResult(null);

      try {
        const res = await fetch(
          `/api/payments/verify?reference=${encodeURIComponent(reference)}`
        );
        const data = await res.json();

        if (data.status === "success") {
          setCredits(data.credits);
          setResult({
            type: "success",
            message: `${data.added ?? ""} credits added to your account!`,
            added: data.added,
          });
          updateSession();
        } else {
          setResult({
            type: "error",
            message: data.message || data.error || "Payment verification failed",
          });
        }
      } catch {
        setResult({ type: "error", message: "Failed to verify payment" });
      } finally {
        setVerifying(false);
      }
    })();
  }, [searchParams, status, updateSession]);

  const handleBuy = async (pkg: CreditPackage) => {
    setLoadingPackage(pkg.id);
    setResult(null);

    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      const data = await res.json();

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setResult({
          type: "error",
          message: data.error || "Failed to initialize payment",
        });
        setLoadingPackage(null);
      }
    } catch {
      setResult({ type: "error", message: "Failed to start payment" });
      setLoadingPackage(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-amber-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-orange-500/[0.02] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/chat"
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </Link>
          <h1 className="text-2xl font-bold">Buy Credits</h1>
        </div>

        {/* Current Balance */}
        <div className="mb-8 bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6 flex items-center gap-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-white/5 max-w-md">
          <div className="p-3 bg-amber-500/10 rounded-xl">
            <Coins className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-white/50">Current Balance</p>
            <p className="text-3xl font-bold">
              {credits !== null ? credits.toLocaleString() : "---"}
              <span className="text-base font-normal text-white/50 ml-2">
                credits
              </span>
            </p>
          </div>
        </div>

        {/* Result Banner */}
        {verifying && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            <span className="text-amber-200">Verifying your payment...</span>
          </div>
        )}

        {result && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              result.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-red-500/10 border border-red-500/20"
            }`}
          >
            {result.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span
              className={
                result.type === "success" ? "text-emerald-200" : "text-red-200"
              }
            >
              {result.message}
            </span>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CREDIT_PACKAGES.map((pkg, i) => {
            const meta = PACKAGE_META[pkg.id] || PACKAGE_META.starter;
            const isLoading = loadingPackage === pkg.id;
            const pricePerCredit = pkg.priceInKobo / 100 / pkg.credits;
            const isDark = i === 2;
            const CheckIcon = isDark ? DarkCheckIcon : LightCheckIcon;

            return (
              <div
                key={pkg.id}
                className={[
                  "rounded-3xl p-2 transition-transform hover:scale-[1.02]",
                  isDark
                    ? "bg-neutral-900/60 backdrop-blur-md border border-neutral-800 shadow-[0_12px_50px_-15px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-white/5"
                    : "bg-white/[0.065] backdrop-blur-md border border-neutral-200/20 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-white/10",
                ].join(" ")}
              >
                {/* Top section */}
                <div
                  className={[
                    "rounded-2xl p-6 sm:p-8 mb-2",
                    isDark
                      ? "bg-neutral-900/70 backdrop-blur-sm border border-neutral-800 ring-1 ring-inset ring-white/10"
                      : "bg-white/[0.08] backdrop-blur-sm border border-white/10 ring-1 ring-inset ring-white/5",
                  ].join(" ")}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <h2
                      className={[
                        "text-2xl sm:text-3xl font-bold tracking-tight",
                        isDark ? "text-neutral-50" : "text-white",
                      ].join(" ")}
                    >
                      {pkg.name}
                    </h2>
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium backdrop-blur",
                        isDark
                          ? "border border-amber-500/40 bg-amber-500/20 text-amber-300"
                          : "border border-white/15 bg-white/10 text-white/70",
                      ].join(" ")}
                    >
                      {meta.tag}
                    </span>
                  </div>

                  <p className="text-sm text-white/40 mb-1">
                    {formatVoiceTime(pkg.credits)} of voice
                  </p>

                  <div className="flex items-baseline mb-6">
                    <span
                      className={[
                        "text-4xl sm:text-5xl font-bold tracking-tighter",
                        isDark ? "text-white" : "text-white/95",
                      ].join(" ")}
                    >
                      {formatNaira(pkg.priceInKobo)}
                    </span>
                  </div>

                  <p className="text-xs text-white/30 mb-6">
                    {formatNaira(pricePerCredit * 100)}/credit
                  </p>

                  <button
                    onClick={() => handleBuy(pkg)}
                    disabled={isLoading || loadingPackage !== null}
                    className={[
                      "w-full rounded-xl font-semibold text-base py-4",
                      "hover:opacity-90 transition-all duration-200",
                      "flex items-center justify-center gap-2.5",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isDark
                        ? "bg-white text-neutral-900 shadow-[0_4px_18px_-6px_rgba(255,255,255,0.35)] ring-1 ring-inset ring-white/30"
                        : "bg-white/90 text-neutral-900 shadow-[0_4px_18px_-6px_rgba(255,255,255,0.15)] ring-1 ring-inset ring-white/20",
                    ].join(" ")}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Buy Now"
                    )}
                  </button>
                </div>

                {/* Features section */}
                <div
                  className={[
                    "px-5 pb-5 pt-4 rounded-2xl",
                    isDark
                      ? "bg-neutral-900/55 backdrop-blur-sm border border-neutral-800 ring-1 ring-inset ring-white/10"
                      : "bg-white/[0.05] backdrop-blur-sm border border-white/10 ring-1 ring-inset ring-white/5",
                  ].join(" ")}
                >
                  <div className="space-y-3">
                    {meta.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <CheckIcon className="w-4 h-4 flex-shrink-0" />
                        <span
                          className={[
                            "text-sm font-medium",
                            isDark ? "text-neutral-300" : "text-white/80",
                          ].join(" ")}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-white/30">
          Payments are processed securely by Paystack. Credits are non-refundable.
        </p>
      </div>
    </div>
  );
}
