"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Mic,
} from "lucide-react";
import { LogoOrb } from "@/components/voice-orb-3d";

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center justify-center transition-transform hover:-translate-y-1 cursor-default">
    <span className="text-xl font-bold text-chamber-100 sm:text-2xl font-display">{value}</span>
    <span className="text-[10px] uppercase tracking-wider text-chamber-500 font-medium sm:text-xs">
      {label}
    </span>
  </div>
);

export default function LandingHero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full bg-chamber-900 text-chamber-100 overflow-hidden font-body">
      {/* Scoped animations */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-fade-in {
          animation: fadeSlideIn 0.8s ease-out forwards;
          opacity: 0;
        }
        .hero-delay-100 { animation-delay: 0.1s; }
        .hero-delay-200 { animation-delay: 0.2s; }
        .hero-delay-300 { animation-delay: 0.3s; }
        .hero-delay-400 { animation-delay: 0.4s; }
        .hero-delay-500 { animation-delay: 0.5s; }
      `}</style>

      {/* Background Image with Gradient Mask */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 hue-rotate-[15deg] saturate-[0.6]"
        style={{
          backgroundImage: "url('https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/a72ca2f3-9dd1-4fe4-84ba-fe86468a5237_3840w.webp?w=800&q=80')",
          maskImage: "linear-gradient(180deg, transparent 0%, black 10%, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 10%, black 70%, transparent 100%)",
        }}
      />

      {/* Atmospheric background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
        <div
          className="absolute -top-1/4 -left-1/4 w-[600px] sm:w-[900px] h-[600px] sm:h-[900px] rounded-full animate-ambient"
          style={{
            background:
              "radial-gradient(circle, rgba(224, 124, 56, 0.1) 0%, rgba(224, 124, 56, 0.03) 50%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full animate-ambient-slow"
          style={{
            background:
              "radial-gradient(circle, rgba(196, 149, 106, 0.08) 0%, rgba(196, 149, 106, 0.02) 50%, transparent 70%)",
            animationDelay: "-10s",
          }}
        />
      </div>

      {/* --- MOBILE HERO (full viewport, centered, immersive) --- */}
      <div className="relative z-10 lg:hidden min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-6 text-center">
        {mounted && (
          <>
            <div className="hero-fade-in hero-delay-100 mb-8">
              <LogoOrb size={80} animated />
            </div>

            <h1
              className="hero-fade-in hero-delay-200 text-4xl sm:text-5xl font-display font-medium tracking-tighter leading-[0.9] mb-5"
            >
              You already know.
              <br />
              <span className="bg-gradient-to-br from-chamber-100 via-ember-300 to-ember-500 bg-clip-text text-transparent">
                Let&apos;s find it
              </span>
              <br />
              together.
            </h1>

            <p className="hero-fade-in hero-delay-300 text-base text-chamber-400 leading-relaxed max-w-sm mb-8">
              Say what&apos;s on your mind. Sage will help you get to the clarity
              you&apos;ve been looking for.
            </p>

            <Link
              href="/chat"
              className="hero-fade-in hero-delay-400 group inline-flex items-center justify-center gap-2 rounded-full bg-ember-500 px-8 py-4 text-sm font-semibold text-white transition-all active:scale-[0.98] shadow-lg shadow-ember-500/25 w-full max-w-xs"
            >
              Start a Conversation
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Scroll hint */}
            <div className="hero-fade-in hero-delay-500 mt-12 text-chamber-600 text-xs tracking-wide animate-breathe">
              scroll to learn more
            </div>
          </>
        )}
      </div>

      {/* --- DESKTOP HERO (two-column layout) --- */}
      <div className="relative z-10 hidden lg:block mx-auto max-w-7xl px-4 pt-32 pb-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left Column */}
          <div className="col-span-7 flex flex-col justify-center space-y-8 pt-8">
            {mounted && (
              <>
                <h1
                  className="hero-fade-in hero-delay-100 text-7xl xl:text-8xl font-display font-medium tracking-tighter leading-[0.9]"
                  style={{
                    maskImage:
                      "linear-gradient(180deg, black 0%, black 80%, transparent 100%)",
                    WebkitMaskImage:
                      "linear-gradient(180deg, black 0%, black 80%, transparent 100%)",
                  }}
                >
                  You already know.
                  <br />
                  <span className="bg-gradient-to-br from-chamber-100 via-ember-300 to-ember-500 bg-clip-text text-transparent">
                    Let&apos;s find it
                  </span>
                  <br />
                  together.
                </h1>

                <p className="hero-fade-in hero-delay-200 max-w-xl text-lg text-chamber-400 leading-relaxed">
                  Sage is an AI companion that thinks with you, not for you. Say
                  what&apos;s on your mind, and together you&apos;ll get to the
                  clarity you&apos;ve been looking for.
                </p>

                <div className="hero-fade-in hero-delay-300 flex flex-row gap-4">
                  <Link
                    href="/chat"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-ember-500 px-8 py-4 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-ember-600 active:scale-[0.98] shadow-lg shadow-ember-500/25"
                  >
                    Start a Conversation
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link
                    href="/chat"
                    className="group inline-flex items-center justify-center gap-2 rounded-full border border-gold-400/15 bg-chamber-800/30 px-8 py-4 text-sm font-semibold text-chamber-100 backdrop-blur-sm transition-colors hover:bg-chamber-800/50 hover:border-gold-400/25"
                  >
                    <Mic className="w-4 h-4 text-ember-500" />
                    Try Voice Mode
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Stats Card (desktop only) */}
          <div className="col-span-5 space-y-6 mt-12">
            {mounted && (
              <div className="hero-fade-in hero-delay-400 relative overflow-hidden rounded-3xl border border-gold-400/10 bg-chamber-800/30 p-8 backdrop-blur-xl shadow-2xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-ember-500/5 blur-3xl pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <LogoOrb size={48} animated />
                    <div>
                      <div className="text-sm text-chamber-400">What to expect</div>
                      <div className="text-lg font-display font-semibold text-chamber-100">
                        A conversation that goes deeper
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <p className="text-sm text-chamber-400 leading-relaxed">
                      Most AI gives you answers. Sage gives you better questions.
                      Each conversation peels back another layer, until you see
                      something you couldn&apos;t see before.
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-chamber-400">Conversation depth</span>
                      <span className="text-chamber-100 font-medium">Multi-layered</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-chamber-800/50">
                      <div className="h-full w-full rounded-full bg-gradient-to-r from-ember-500 via-gold-400 to-sage-400" />
                    </div>
                  </div>

                  <div className="h-px w-full bg-gold-400/10 mb-6" />

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <StatItem value="Voice" label="& Text" />
                    <StatItem value="Private" label="Always" />
                    <StatItem value="Free" label="To Try" />
                  </div>

                  <div className="mt-8 flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/10 bg-chamber-800/40 px-3 py-1 text-[10px] font-medium tracking-wide text-chamber-300">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sage-400" />
                      </span>
                      LISTENING
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/10 bg-chamber-800/40 px-3 py-1 text-[10px] font-medium tracking-wide text-chamber-300">
                      <LogoOrb size={12} />
                      AI-POWERED
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
