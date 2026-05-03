"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SageMark } from "@/components/v2/sage-mark";

const SLIDES = [
  {
    title: "sage helps you think out loud",
    sub: "talk through what's stuck, what's unclear, what you can't quite name yet.",
    hue: "ember",
  },
  {
    title: "questions, not lectures",
    sub: "no advice dump. just the kind of questions that crack things open.",
    hue: "gold",
  },
  {
    title: "private by default. ghost when you need it.",
    sub: "your sessions stay yours. flip ghost mode and nothing is saved.",
    hue: "plum",
  },
];

const HUE_GLOW: Record<string, string> = {
  ember: "radial-gradient(circle, rgba(224,124,56,0.55) 0%, transparent 60%)",
  gold: "radial-gradient(circle, rgba(196,149,106,0.55) 0%, transparent 60%)",
  plum: "radial-gradient(circle, rgba(180,138,242,0.45) 0%, transparent 60%)",
};

const HUE_TEXT: Record<string, string> = {
  ember: "text-ember-400",
  gold: "text-gold-300",
  plum: "text-plum-400",
};

const HUE_DOT: Record<string, string> = {
  ember: "bg-ember-500",
  gold: "bg-gold-400",
  plum: "bg-plum-400",
};

export default function WelcomePage() {
  const [i, setI] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const slide = SLIDES[i];

  const next = () => {
    if (i < SLIDES.length - 1) setI(i + 1);
  };

  return (
    <div className="v2-screen bg-chamber-900 lg:!max-w-5xl lg:px-12 lg:pt-20 lg:pb-16">
      {/* On lg: side-by-side hero + copy. On mobile: stacked with hero on top
          taking the upper half. */}
      <div className="flex flex-col flex-1 lg:flex-row lg:items-center lg:gap-16 lg:flex-none">
        {/* Hero illustration */}
        <div className="flex-1 flex items-center justify-center relative lg:flex-1 lg:min-h-[60vh]">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative"
          >
            <div
              className="absolute inset-0 -z-10 rounded-full"
              style={{
                background: HUE_GLOW[slide.hue],
                filter: "blur(40px)",
                transform: "scale(1.6)",
              }}
            />
            <span className="lg:hidden">
              <SageMark size={180} />
            </span>
            <span className="hidden lg:inline-block">
              <SageMark size={300} />
            </span>
          </motion.div>
        </div>

        {/* Right column on desktop: copy + dots + terms + CTA */}
        <div className="lg:flex-1 lg:flex lg:flex-col lg:justify-center lg:max-w-md">
          {/* Copy */}
          <motion.div
            key={`copy-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-6 lg:mb-8"
          >
            <h1 className="v2-h1 mb-3 lg:text-5xl">
              {slide.title.split(" ").slice(0, -2).join(" ")}{" "}
              <span className={HUE_TEXT[slide.hue]}>
                {slide.title.split(" ").slice(-2).join(" ")}
              </span>
            </h1>
            <p className="v2-sub lg:text-lg">{slide.sub}</p>
          </motion.div>

          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mb-8 lg:justify-start">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i
                    ? `w-8 ${HUE_DOT[slide.hue]}`
                    : "w-1.5 bg-chamber-700"
                }`}
              />
            ))}
          </div>

          {/* Terms + CTA */}
          <div className="space-y-4">
            <button
              onClick={() => setAccepted((a) => !a)}
              className="flex items-start gap-3 text-left w-full"
            >
              <span
                className={`mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  accepted ? "bg-ember-500 border-ember-500" : "border-chamber-600"
                }`}
              >
                {accepted && (
                  <svg
                    viewBox="0 0 12 12"
                    className="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M2.5 6.5l2.5 2.5 4.5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="text-xs text-chamber-400 leading-relaxed">
                i accept the{" "}
                <span className="underline">terms of service</span> and{" "}
                <span className="underline">privacy policy</span> to continue.
              </span>
            </button>

            {i < SLIDES.length - 1 ? (
              <button
                onClick={next}
                className="v2-btn v2-btn-light w-full"
                disabled={!accepted}
              >
                next
              </button>
            ) : (
              <Link
                href={accepted ? "/auth/signin" : "#"}
                className={`v2-btn v2-btn-light w-full ${!accepted && "pointer-events-none opacity-50"}`}
              >
                continue with apple
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
