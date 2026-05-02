"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Ghost } from "lucide-react";

const STORAGE_KEY = "sage-ghost-mode";

export default function GhostPage() {
  const [on, setOn] = useState(false);

  // Hydrate from localStorage so the toggle reflects the current state
  // shared with useSocraticChat.
  useEffect(() => {
    try {
      setOn(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setOn((prev) => {
      const next = !prev;
      try {
        if (next) localStorage.setItem(STORAGE_KEY, "1");
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="v2-screen bg-chamber-900">
      <Link
        href="/v2/profile"
        className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center mb-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <motion.div
          animate={{ y: on ? -10 : 0, opacity: on ? 0.6 : 1 }}
          transition={{ duration: 0.5 }}
          className="text-chamber-50 mb-6"
        >
          <Ghost className="h-24 w-24" strokeWidth={1.2} />
        </motion.div>

        <h1 className="v2-h1 mb-3 text-center">ghost mode</h1>
        <p className="v2-sub max-w-xs text-center mb-12">
          when on, nothing you say is saved. no transcript, no insights, no
          trace. just a conversation that ends when you close it.
        </p>

        <button
          onClick={toggle}
          className={`relative h-16 w-32 rounded-full transition-colors ${
            on ? "bg-ember-500" : "bg-chamber-800"
          }`}
        >
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`absolute top-1.5 h-13 w-13 rounded-full ${
              on ? "right-1.5 bg-chamber-900" : "left-1.5 bg-chamber-50"
            }`}
            style={{ height: 52, width: 52 }}
          />
        </button>

        <p className="text-sm mt-6 lowercase">
          {on ? (
            <span className="text-ember-400">ghost mode is on</span>
          ) : (
            <span className="text-chamber-500">currently saving entries</span>
          )}
        </p>
      </div>

      <Link
        href={on ? "/v2/chat/voice" : "/v2/profile"}
        className="v2-btn v2-btn-light w-full"
      >
        {on ? "start a private session" : "back"}
      </Link>
    </div>
  );
}
