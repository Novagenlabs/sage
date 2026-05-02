"use client";

// Animated soft glow blob — used as ambient background on home, voice screens.
// Pass 2: replace with QuiverAI-generated abstract shapes.
import { motion } from "framer-motion";

export function MoodOrb({
  hue = "zest",
  className = "",
}: {
  hue?: "zest" | "bloom" | "plum" | "peach";
  className?: string;
}) {
  const color = {
    zest: "rgba(207, 232, 58, 0.55)",
    bloom: "rgba(245, 184, 214, 0.6)",
    plum: "rgba(180, 138, 242, 0.6)",
    peach: "rgba(247, 176, 138, 0.6)",
  }[hue];

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <motion.div
        className="absolute"
        style={{
          left: "50%",
          top: "55%",
          width: "75%",
          aspectRatio: "1.2 / 1",
          borderRadius: "50%",
          translateX: "-50%",
          translateY: "-50%",
          background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
          filter: "blur(60px)",
        }}
        animate={{
          scale: [1, 1.15, 0.95, 1],
          x: ["-50%", "-46%", "-54%", "-50%"],
          y: ["-50%", "-54%", "-48%", "-50%"],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
