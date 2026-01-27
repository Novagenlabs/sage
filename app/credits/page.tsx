"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  Crown,
} from "lucide-react";

interface Package {
  id: string;
  name: string;
  credits: number;
  priceInKobo: number;
}

const PACKAGES: Package[] = [
  { id: "starter", name: "Starter", credits: 500, priceInKobo: 100000 },
  { id: "plus", name: "Plus", credits: 1500, priceInKobo: 250000 },
  { id: "pro", name: "Pro", credits: 5000, priceInKobo: 700000 },
];

const PACKAGE_ICONS = [Sparkles, Zap, Crown];

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}

export default function CreditsPage() {
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

  const verifyPayment = useCallback(
    async (reference: string) => {
      if (verifying) return;
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
    },
    [verifying, updateSession]
  );

  // Auto-verify on callback redirect
  useEffect(() => {
    const reference = searchParams.get("reference");
    if (reference && status === "authenticated") {
      verifyPayment(reference);
      // Clean URL
      window.history.replaceState({}, "", "/credits");
    }
  }, [searchParams, status, verifyPayment]);

  const handleBuy = async (pkg: Package) => {
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

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </Link>
          <h1 className="text-2xl font-bold">Buy Credits</h1>
        </div>

        {/* Current Balance */}
        <div className="mb-8 bg-stone-900/50 border border-stone-700/30 rounded-2xl p-6 flex items-center gap-4">
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

        {/* Packages */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PACKAGES.map((pkg, i) => {
            const Icon = PACKAGE_ICONS[i];
            const isLoading = loadingPackage === pkg.id;
            const pricePerCredit = pkg.priceInKobo / 100 / pkg.credits;

            return (
              <div
                key={pkg.id}
                className={`relative bg-stone-900/50 border rounded-2xl p-6 flex flex-col transition-colors ${
                  i === 2
                    ? "border-amber-500/40 ring-1 ring-amber-500/20"
                    : "border-stone-700/30"
                }`}
              >
                {i === 2 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 text-black text-xs font-semibold rounded-full">
                    Best Value
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`p-2 rounded-lg ${
                      i === 2
                        ? "bg-amber-500/20"
                        : i === 1
                        ? "bg-blue-500/10"
                        : "bg-white/5"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        i === 2
                          ? "text-amber-400"
                          : i === 1
                          ? "text-blue-400"
                          : "text-white/60"
                      }`}
                    />
                  </div>
                  <h3 className="text-lg font-semibold">{pkg.name}</h3>
                </div>

                <p className="text-3xl font-bold mb-1">
                  {pkg.credits.toLocaleString()}
                </p>
                <p className="text-sm text-white/50 mb-1">credits</p>
                <p className="text-xs text-white/30 mb-6">
                  {formatNaira(pricePerCredit * 100)}/credit
                </p>

                <div className="mt-auto">
                  <p className="text-xl font-semibold mb-3">
                    {formatNaira(pkg.priceInKobo)}
                  </p>
                  <button
                    onClick={() => handleBuy(pkg)}
                    disabled={isLoading || loadingPackage !== null}
                    className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                      i === 2
                        ? "bg-amber-500 hover:bg-amber-400 text-black disabled:bg-amber-500/50"
                        : "bg-white/10 hover:bg-white/15 text-white disabled:bg-white/5 disabled:text-white/30"
                    }`}
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
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          Payments are processed securely by Paystack. Credits are non-refundable.
        </p>
      </div>
    </div>
  );
}
