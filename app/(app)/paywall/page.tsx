"use client";

// Paywall: shown when a user lands on a credit-gated screen with too few
// credits. Reuses the real CREDIT_PACKAGES from lib/paystack.ts so this is
// a true upsell, not marketing copy.

import Link from "next/link";
import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import {
  CREDIT_PACKAGES,
  type CreditPackage,
  formatNaira,
} from "@/lib/paystack";

const PACKAGE_BLURBS: Record<string, string> = {
  starter: "dip a toe in",
  plus: "the sweet spot",
  pro: "go deep",
};

function fmtVoice(credits: number) {
  const m = Math.floor(credits / 60);
  const s = credits % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export default function PaywallPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const buy = async (pkg: CreditPackage) => {
    setLoadingId(pkg.id);
    setError("");
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
      setError(data.error || "couldn't start payment");
    } catch {
      setError("couldn't start payment");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="v2-screen bg-chamber-900 lg:!max-w-5xl lg:px-10 lg:pt-16">
      <div className="flex justify-between items-start mb-6 lg:mb-10">
        <h1 className="v2-h1 lg:text-5xl lg:text-center lg:flex-1">
          top up
          <br />
          to keep going
        </h1>
        <Link
          href="/home"
          className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center text-chamber-300 lg:absolute lg:top-6 lg:right-6"
          aria-label="close"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>

      <p className="v2-sub mb-6 max-w-sm lg:max-w-xl lg:mx-auto lg:text-center lg:mb-10">
        credits power voice and chat. one credit ≈ one second of voice or a
        short text exchange. video is ~3× voice.
      </p>

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-3 mb-4 text-sm text-red-300 lowercase text-center lg:max-w-xl lg:mx-auto">
          {error}
        </div>
      )}

      <div className="space-y-3 flex-1 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-stretch lg:flex-none">
        {CREDIT_PACKAGES.map((pkg, i) => {
          const blurb = PACKAGE_BLURBS[pkg.id] ?? "";
          const featured = pkg.id === "plus";
          const isLoading = loadingId === pkg.id;
          const anyLoading = loadingId !== null;
          return (
            <button
              key={pkg.id}
              onClick={() => buy(pkg)}
              disabled={anyLoading}
              className={`relative w-full text-left rounded-3xl p-5 transition-all disabled:opacity-50 flex flex-col lg:p-7 ${
                featured
                  ? "bg-chamber-800/70 border border-ember-500/40 shadow-[0_8px_28px_-12px_rgba(224,124,56,0.45)] lg:-translate-y-2"
                  : "bg-chamber-800/40 border border-chamber-800 hover:bg-chamber-800/70"
              }`}
            >
              <span
                className={`absolute -top-2 right-5 inline-block px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-full ${
                  featured
                    ? "bg-ember-500 text-white"
                    : i === CREDIT_PACKAGES.length - 1
                    ? "bg-gold-400 text-chamber-900"
                    : "bg-chamber-700 text-chamber-200"
                }`}
              >
                {featured
                  ? "popular"
                  : i === CREDIT_PACKAGES.length - 1
                  ? "best value"
                  : pkg.id}
              </span>

              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-display text-2xl lowercase tracking-tight">
                  {pkg.name.toLowerCase()}
                </h3>
                <span className="text-xs text-chamber-500 lowercase">{blurb}</span>
              </div>

              <p className="text-sm text-chamber-400 mb-3 lowercase">
                ~{fmtVoice(pkg.credits)} of voice · {pkg.credits.toLocaleString()} credits
              </p>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="font-display text-3xl tracking-tight text-chamber-50">
                  {formatNaira(pkg.priceInKobo)}
                </span>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <span className="inline-flex items-center gap-1.5 text-xs text-chamber-300 lowercase">
                  <Check
                    className={`h-3.5 w-3.5 ${
                      featured ? "text-ember-400" : "text-gold-300"
                    }`}
                    strokeWidth={3}
                  />
                  pay once · credits never expire
                </span>
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-chamber-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Link
        href="/credits"
        className="block text-center text-sm text-chamber-400 mt-6 lg:mt-10 lowercase"
      >
        view full plan details
      </Link>
    </div>
  );
}
