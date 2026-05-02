"use client";

// "Congrats you are in" celebration screen — shows after sign-up.
import Link from "next/link";
import { motion } from "framer-motion";

export default function InPage() {
  return (
    <div className="v2-screen bg-chamber-900 px-0 items-stretch justify-between">
      {/* Top blob */}
      <div className="relative h-1/3">
        <svg
          viewBox="0 0 400 200"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full text-zest-300"
          fill="currentColor"
          aria-hidden
        >
          <path d="M0 0 L400 0 L400 100 Q 350 130 320 110 Q 300 145 240 130 Q 200 180 160 130 Q 100 145 80 110 Q 50 130 0 100 Z" />
        </svg>
      </div>

      {/* Big middle */}
      <div className="flex-1 flex items-center justify-center bg-zest-300 relative">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="text-center px-6"
        >
          <p className="font-display text-2xl text-plum-600 tracking-tight lowercase mb-3">
            congrats you are
          </p>
          <h1 className="font-display text-[7rem] leading-none tracking-tight lowercase text-plum-600">
            in
          </h1>
        </motion.div>
      </div>

      {/* Bottom blob mirror */}
      <div className="relative h-1/4">
        <svg
          viewBox="0 0 400 200"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full text-zest-300"
          fill="currentColor"
          aria-hidden
        >
          <path d="M0 100 Q 50 70 80 90 Q 100 55 160 70 Q 200 20 240 70 Q 300 55 320 90 Q 350 70 400 100 L400 200 L0 200 Z" />
        </svg>
      </div>

      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] -mt-2">
        <Link
          href="/onboarding/name"
          className="v2-btn v2-btn-ghost w-full"
        >
          let&apos;s make sage yours
        </Link>
      </div>
    </div>
  );
}
