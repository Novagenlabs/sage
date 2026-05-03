"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Mic,
  MessageSquare,
  Lightbulb,
  Shield,
  Ghost,
  Ear,
  Eye,
  ChevronDown,
} from "lucide-react";
import { LogoOrb } from "@/components/voice-orb-3d";
import LandingHero from "@/components/landing-hero";
import { clsx } from "clsx";

const FEATURES = [
  {
    icon: Mic,
    title: "Say it out loud",
    description:
      "Sage listens in real time. Just talk about what's weighing on you. The conversation flows naturally, like you're speaking with someone who actually wants to understand.",
  },
  {
    icon: Ear,
    title: "Questions, not lectures",
    description:
      "You won't get a wall of advice. Sage asks the kind of questions a good mentor would. The ones that make you pause and see your situation differently.",
  },
  {
    icon: MessageSquare,
    title: "Type when you want to",
    description:
      "Some thoughts are easier to write out. Switch between voice and text whenever you want. Same depth, different mode.",
  },
  {
    icon: Eye,
    title: "Watch your thinking unfold",
    description:
      "As you talk, Sage surfaces the key threads. Patterns you hadn't noticed, tensions you'd been avoiding, and the breakthroughs hiding between them.",
  },
  {
    icon: Ghost,
    title: "Ghost mode",
    description:
      "Thinking through something you'd rather keep to yourself? Turn on Ghost mode. Nothing gets saved. No trace, no record.",
  },
  {
    icon: Shield,
    title: "No rush, no judgment",
    description:
      "Sage doesn't push you toward a conclusion. It follows your lead, sits with the hard stuff, and lets your thinking move at whatever pace feels right.",
  },
];

const EXAMPLE_TOPICS = [
  "I'm stuck on whether to leave my job",
  "I keep putting off the things that matter most",
  "Something feels off in my relationship but I can't name it",
  "I want more from my career but I don't know what",
  "I set goals and then quietly abandon them",
  "I'm doing fine on paper but I don't feel fine",
];

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showMoreFeatures, setShowMoreFeatures] = useState(false);
  const topicsRef = useRef<HTMLDivElement>(null);
  const isSignedIn = status === "authenticated" && !!session;

  useEffect(() => {
    setMounted(true);
    // Capture referral code from URL and store for signup
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        localStorage.setItem("sage_referral_code", ref);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  // v2 launch — signed-in users go directly to the new app shell.
  // We keep the v1 marketing landing visible to signed-out users for now;
  // once v2 is fully validated we can flip this to always redirect.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/home");
    }
  }, [status, router]);

  return (
    <div className="w-full min-h-screen overflow-y-auto bg-chamber-900">
      {/* Grain texture overlay */}
      <div className="grain-overlay" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gold-400/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <LogoOrb size={32} />
              <div>
                <h1 className="text-base sm:text-lg font-display font-semibold tracking-tight text-chamber-50">
                  Sage
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isSignedIn && (
                <Link
                  href="/auth/signin"
                  className="btn-sm text-sm font-medium text-chamber-300 hover:text-chamber-100 transition-colors px-4 py-2"
                >
                  Sign In
                </Link>
              )}
              <Link
                href="/chat/voice"
                className="btn-sm inline-flex items-center gap-2 rounded-full bg-ember-500 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-ember-600 active:scale-[0.98]"
              >
                {isSignedIn ? "Go to Sage" : "Open Sage"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <LandingHero />

      {/* --- TOPICS: horizontal scroll on mobile, grid on desktop --- */}
      <section className="relative py-14 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2
              className={clsx(
                "font-display text-2xl sm:text-3xl lg:text-5xl font-medium tracking-tight text-chamber-50 mb-3 sm:mb-4 opacity-0",
                mounted && "animate-fade-up stagger-2"
              )}
            >
              What brings people here
            </h2>
            <p
              className={clsx(
                "text-sm sm:text-base lg:text-lg text-chamber-400 max-w-2xl mx-auto opacity-0",
                mounted && "animate-fade-up stagger-3"
              )}
            >
              Most conversations start with a feeling that something needs to
              change. You don&apos;t need to know exactly what.
            </p>
          </div>

          {/* Mobile: horizontal scroll */}
          <div
            ref={topicsRef}
            className="lg:hidden flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {EXAMPLE_TOPICS.map((topic, i) => (
              <Link
                key={i}
                href="/chat/voice"
                className="group flex-shrink-0 w-[75vw] sm:w-[45vw] snap-start p-4 glass hover:bg-chamber-800/60 rounded-xl transition-all duration-300 flex items-center gap-3 hover:border-gold-400/20"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-ember-500/60 group-hover:bg-ember-500 group-hover:shadow-[0_0_8px_rgba(224,124,56,0.5)] transition-all duration-300 flex-shrink-0" />
                <span className="text-sm text-chamber-300 group-hover:text-chamber-100 transition-colors leading-relaxed">
                  {topic}
                </span>
              </Link>
            ))}
          </div>

          {/* Desktop: grid */}
          <div className="hidden lg:grid grid-cols-3 gap-4 max-w-4xl mx-auto">
            {EXAMPLE_TOPICS.map((topic, i) => (
              <Link
                key={i}
                href="/chat/voice"
                className="group p-5 glass hover:bg-chamber-800/60 rounded-xl transition-all duration-300 flex items-center gap-3 hover:border-gold-400/20"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-ember-500/60 group-hover:bg-ember-500 group-hover:shadow-[0_0_8px_rgba(224,124,56,0.5)] transition-all duration-300 flex-shrink-0" />
                <span className="text-sm text-chamber-300 group-hover:text-chamber-100 transition-colors leading-relaxed">
                  {topic}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- FEATURES: show 2 + expand on mobile, full grid on desktop --- */}
      <section className="relative py-14 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <p className="text-[10px] sm:text-xs uppercase tracking-widest text-ember-500 mb-3 sm:mb-4 font-medium">
              How it works
            </p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-medium tracking-tight text-chamber-50 mb-3 sm:mb-4">
              Dialogue, not advice
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-chamber-400 max-w-2xl mx-auto">
              Sage won&apos;t tell you what to do. It helps you hear yourself
              think. Clearly, honestly, without the noise.
            </p>
          </div>

          {/* Mobile: show 2 cards, expandable */}
          <div className="lg:hidden space-y-4">
            {FEATURES.slice(0, showMoreFeatures ? FEATURES.length : 2).map((feature, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-gold-400/10 bg-chamber-800/20 p-6 backdrop-blur-sm"
              >
                <div className="relative z-10 flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-500/10 ring-1 ring-ember-500/20 flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-ember-500" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-chamber-100 mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-chamber-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {!showMoreFeatures && (
              <button
                onClick={() => setShowMoreFeatures(true)}
                className="btn-sm w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-chamber-400 hover:text-chamber-200 transition-colors"
              >
                See more
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desktop: full grid */}
          <div className="hidden lg:grid grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-gold-400/10 bg-chamber-800/20 p-8 backdrop-blur-sm transition-all duration-300 hover:bg-chamber-800/40 hover:border-gold-400/20"
              >
                <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-ember-500/5 blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-500/10 ring-1 ring-ember-500/20 mb-5">
                    <feature.icon className="h-5 w-5 text-ember-500" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-chamber-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-chamber-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- QUOTE SECTION: desktop only --- */}
      <section className="relative py-20 sm:py-28 hidden lg:block">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative overflow-hidden rounded-3xl border border-gold-400/10 bg-chamber-800/20 p-16 backdrop-blur-sm">
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(224, 124, 56, 0.06) 0%, transparent 60%)",
                }}
              />
            </div>
            <div className="relative z-10">
              <div className="flex justify-center mb-8">
                <LogoOrb size={64} animated />
              </div>
              <blockquote className="font-display text-4xl text-chamber-100 italic leading-snug mb-6 tracking-tight">
                &ldquo;The answer was always there. I just needed someone to help me hear it.&rdquo;
              </blockquote>
              <p className="mt-8 text-base text-chamber-400 max-w-lg mx-auto leading-relaxed">
                You don&apos;t need more information. You need a better
                conversation. One that helps you cut through the noise
                and get to what actually matters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FINAL CTA: compact on mobile --- */}
      <section className="relative py-14 sm:py-20 lg:py-28 pb-20 sm:pb-24 lg:pb-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-medium tracking-tight text-chamber-50 mb-3 sm:mb-4">
            What&apos;s on your mind?
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-chamber-400 max-w-xl mx-auto mb-8 sm:mb-10">
            You don&apos;t need to have it figured out. Just start talking.
          </p>
          <div className="flex justify-center lg:hidden">
            <Link
              href="/chat/voice"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-ember-500 px-8 py-4 text-sm font-semibold text-white transition-all active:scale-[0.98] shadow-lg shadow-ember-500/25 w-full max-w-xs"
            >
              Talk to Sage
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="hidden lg:flex justify-center">
            <Link
              href="/chat/voice"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-ember-500 px-10 py-4 text-base font-semibold text-white transition-all hover:scale-[1.02] hover:bg-ember-600 active:scale-[0.98] shadow-lg shadow-ember-500/25"
            >
              Talk to Sage
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gold-400/10 py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LogoOrb size={24} />
              <span className="text-sm font-display font-medium text-chamber-400">
                Sage
              </span>
            </div>
            <p className="text-xs text-chamber-600">
              Think clearly. Speak freely.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
