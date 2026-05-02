"use client";

// Internal-only screen index for /v2 — handy for QA at mobile viewport.
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const SECTIONS: Array<{ title: string; routes: { href: string; label: string }[] }> = [
  {
    title: "intro",
    routes: [
      { href: "/v2", label: "splash" },
      { href: "/v2/onboarding/welcome", label: "welcome carousel" },
      { href: "/v2/onboarding/in", label: "you are in" },
    ],
  },
  {
    title: "auth",
    routes: [{ href: "/v2/auth/signin", label: "sign in" }],
  },
  {
    title: "onboarding",
    routes: [
      { href: "/v2/onboarding/name", label: "1 · name" },
      { href: "/v2/onboarding/birthday", label: "2 · birthday" },
      { href: "/v2/onboarding/topics", label: "3 · topics" },
      { href: "/v2/onboarding/notifications", label: "4 · notifications" },
      { href: "/v2/onboarding/voice", label: "5 · voice" },
      { href: "/v2/onboarding/loading", label: "personalizing" },
      { href: "/v2/paywall", label: "paywall" },
    ],
  },
  {
    title: "main app",
    routes: [
      { href: "/v2/home", label: "today / home" },
      { href: "/v2/explore", label: "explore" },
      { href: "/v2/entries", label: "entries" },
      { href: "/v2/entries/1", label: "entry detail" },
      { href: "/v2/entries/active", label: "post-session color" },
      { href: "/v2/patterns", label: "patterns" },
    ],
  },
  {
    title: "chat",
    routes: [
      { href: "/v2/chat/text", label: "text chat" },
      { href: "/v2/chat/voice", label: "voice chat" },
      { href: "/v2/chat/video", label: "video avatar (anam)" },
      { href: "/v2/chat/loading", label: "fetching insights" },
    ],
  },
  {
    title: "tools",
    routes: [
      { href: "/v2/mood", label: "mood picker" },
      { href: "/v2/people", label: "people tag" },
      { href: "/v2/ghost", label: "ghost mode" },
    ],
  },
  {
    title: "settings",
    routes: [
      { href: "/v2/profile", label: "profile" },
      { href: "/v2/profile/passcode", label: "passcode" },
      { href: "/v2/profile/feedback", label: "feedback" },
      { href: "/v2/credits", label: "credits / plans" },
      { href: "/v2/referrals", label: "referrals" },
    ],
  },
];

export default function Guide() {
  return (
    <div className="min-h-[100dvh] bg-chamber-900 pb-12">
      <div className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <h1 className="font-display text-4xl tracking-tight lowercase mb-2">
          sage v2 · screen index
        </h1>
        <p className="text-sm text-chamber-400 mb-8 lowercase">
          every screen built so far. tap one to preview at mobile size.
        </p>

        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <p className="text-xs uppercase tracking-widest text-zest-400 mb-2">
                {s.title}
              </p>
              <div className="rounded-2xl border border-chamber-800 bg-chamber-800/30 overflow-hidden">
                {s.routes.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 border-b border-chamber-800 last:border-0 hover:bg-chamber-800/40 active:bg-chamber-800"
                  >
                    <div>
                      <div className="text-chamber-100 lowercase">{r.label}</div>
                      <div className="text-xs text-chamber-500 font-mono">
                        {r.href}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-chamber-500" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
