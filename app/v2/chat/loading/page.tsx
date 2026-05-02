"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { SageMark } from "@/components/v2/sage-mark";

const QUOTES = [
  { text: "the greatest art is to shape the quality of the day.", who: "henry david thoreau" },
  { text: "the most important conversation is the one you're having with yourself.", who: "david goggins" },
  { text: "between stimulus and response there is a space. in that space is our power.", who: "viktor frankl" },
];

export default function FetchingInsightsPage() {
  const router = useRouter();
  const [q] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    const t = setTimeout(() => router.push("/v2/chat/text"), 2400);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="v2-screen bg-chamber-900 px-6">
      <div className="flex justify-start mb-8">
        <Link
          href="/v2/home"
          className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center"
          aria-label="close"
        >
          <X className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="text-chamber-500 mb-6"
        >
          <SageMark size={120} />
        </motion.div>
        <p className="text-chamber-400 text-sm lowercase">fetching insights...</p>
      </div>

      <div className="mb-12 text-center">
        <p className="text-chamber-200 text-base leading-relaxed mb-2">
          &ldquo;{q.text}&rdquo;
        </p>
        <p className="text-chamber-500 text-sm lowercase">— {q.who}</p>
      </div>
    </div>
  );
}
