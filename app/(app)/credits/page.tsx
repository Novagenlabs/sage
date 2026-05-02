"use client";

import Link from "next/link";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  X,
  Loader2,
  Coins,
  Check,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  CREDIT_PACKAGES,
  type CreditPackage,
  formatNaira,
} from "@/lib/paystack";
import { SageMark } from "@/components/v2/sage-mark";

const PACKAGE_META: Record<
  string,
  { tag: string; tagline: string; features: string[] }
> = {
  starter: {
    tag: "starter",
    tagline: "dip a toe in",
    features: [
      "200 credits",
      "~3 minutes of voice",
      "unlimited typing",
      "email support",
    ],
  },
  plus: {
    tag: "popular",
    tagline: "the sweet spot",
    features: [
      "1,000 credits",
      "~16 minutes of voice",
      "unlimited typing",
      "session reflections",
      "priority support",
    ],
  },
  pro: {
    tag: "best value",
    tagline: "go deep",
    features: [
      "3,000 credits",
      "~50 minutes of voice",
      "unlimited typing",
      "session reflections",
      "evolving profile",
      "priority support",
    ],
  },
};

function fmtVoice(credits: number) {
  const m = Math.floor(credits / 60);
  const s = credits % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function CreditsInner() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  const [credits, setCredits] = useState<number | null>(null);
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?next=/credits");
    }
  }, [status, router]);

  useEffect(() => {
    const c = (session?.user as { credits?: number } | undefined)?.credits;
    if (typeof c === "number") setCredits(c);
  }, [session]);

  // Verify payment on callback (Paystack redirects with ?reference=...)
  useEffect(() => {
    const reference = params.get("reference");
    if (!reference || status !== "authenticated" || verifiedRef.current) return;
    verifiedRef.current = true;
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
            kind: "success",
            message: `${data.added ?? ""} credits added to your account`,
          });
          updateSession();
        } else {
          setResult({
            kind: "error",
            message: data.message || data.error || "payment couldn't be verified",
          });
        }
      } catch {
        setResult({ kind: "error", message: "couldn't verify payment" });
      } finally {
        setVerifying(false);
      }
    })();
  }, [params, status, updateSession]);

  const buy = async (pkg: CreditPackage) => {
    setLoadingPkg(pkg.id);
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
        return;
      }
      setResult({
        kind: "error",
        message: data.error || "couldn't start payment",
      });
      setLoadingPkg(null);
    } catch {
      setResult({ kind: "error", message: "couldn't start payment" });
      setLoadingPkg(null);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="v2-screen bg-chamber-900 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-chamber-900 pb-12">
      <div className="px-6 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/profile"
            className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center"
            aria-label="back"
          >
            <X className="h-4 w-4" />
          </Link>
          <span className="text-xs text-chamber-500 lowercase">credits</span>
          <span className="w-9" />
        </div>

        {/* Headline */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <SageMark size={32} animated />
            <span className="font-display text-2xl tracking-tight lowercase">
              sage credits
            </span>
          </div>
          <h1 className="v2-h1 mb-2">top up to keep going</h1>
          <p className="v2-sub">
            credits power voice and chat. one credit ≈ one second of voice or a
            short text exchange.
          </p>
        </div>

        {/* Current balance */}
        <div className="rounded-2xl bg-chamber-800/40 border border-chamber-800 p-4 mb-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-ember-500/15 ring-1 ring-ember-500/30 flex items-center justify-center">
            <Coins className="h-5 w-5 text-ember-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-chamber-500">
              current balance
            </p>
            <p className="text-2xl font-semibold text-chamber-50">
              {credits !== null ? credits.toLocaleString() : "—"}
              <span className="text-sm text-chamber-400 font-normal ml-2 lowercase">
                credits
              </span>
            </p>
          </div>
        </div>

        {/* Banners */}
        {verifying && (
          <div className="rounded-2xl bg-ember-500/10 border border-ember-500/30 p-3 mb-4 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-ember-400" />
            <span className="text-sm text-ember-200 lowercase">
              verifying your payment...
            </span>
          </div>
        )}
        {result && (
          <div
            className={`rounded-2xl p-3 mb-4 flex items-start gap-2 ${
              result.kind === "success"
                ? "bg-ember-500/10 border border-ember-500/30"
                : "bg-red-500/10 border border-red-500/30"
            }`}
          >
            {result.kind === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-ember-400 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            )}
            <span
              className={`text-sm lowercase ${
                result.kind === "success"
                  ? "text-ember-200"
                  : "text-red-200"
              }`}
            >
              {result.message}
            </span>
          </div>
        )}

        {/* Packages */}
        <div className="space-y-3">
          {CREDIT_PACKAGES.map((pkg, i) => {
            const meta = PACKAGE_META[pkg.id] ?? PACKAGE_META.starter;
            const featured = pkg.id === "plus";
            const pricePerCredit = pkg.priceInKobo / 100 / pkg.credits;
            const isLoading = loadingPkg === pkg.id;
            const anyLoading = loadingPkg !== null;

            return (
              <div
                key={pkg.id}
                className={`relative rounded-3xl p-5 transition-all ${
                  featured
                    ? "bg-chamber-800/70 border border-ember-500/40 shadow-[0_8px_28px_-12px_rgba(224,124,56,0.45)]"
                    : "bg-chamber-800/40 border border-chamber-800"
                }`}
              >
                {/* Tag */}
                <span
                  className={`absolute -top-2 right-5 inline-block px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-full ${
                    featured
                      ? "bg-ember-500 text-white"
                      : i === 2
                      ? "bg-gold-400 text-chamber-900"
                      : "bg-chamber-700 text-chamber-200"
                  }`}
                >
                  {meta.tag}
                </span>

                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="font-display text-2xl lowercase tracking-tight">
                    {pkg.name.toLowerCase()}
                  </h3>
                  <span className="text-xs text-chamber-500 lowercase">
                    {meta.tagline}
                  </span>
                </div>

                <p className="text-sm text-chamber-400 mb-3 lowercase">
                  ~{fmtVoice(pkg.credits)} of voice
                </p>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-display text-4xl tracking-tight text-chamber-50">
                    {formatNaira(pkg.priceInKobo)}
                  </span>
                  <span className="text-xs text-chamber-500 lowercase">
                    {formatNaira(pricePerCredit * 100)}/credit
                  </span>
                </div>

                <ul className="space-y-1.5 mb-5">
                  {meta.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-chamber-200 lowercase"
                    >
                      <Check
                        className={`h-3.5 w-3.5 shrink-0 ${
                          featured ? "text-ember-400" : "text-gold-300"
                        }`}
                        strokeWidth={3}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => buy(pkg)}
                  disabled={anyLoading}
                  className={`v2-btn w-full ${
                    featured ? "v2-btn-primary" : "v2-btn-light"
                  } disabled:opacity-50`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      processing...
                    </>
                  ) : (
                    `top up ${pkg.credits.toLocaleString()} credits`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-chamber-600 mt-6 px-4 leading-relaxed lowercase">
          payments processed securely by paystack. credits are non-refundable
          but never expire.
        </p>
      </div>
    </div>
  );
}

export default function CreditsPage() {
  return (
    <Suspense
      fallback={
        <div className="v2-screen bg-chamber-900 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
        </div>
      }
    >
      <CreditsInner />
    </Suspense>
  );
}
