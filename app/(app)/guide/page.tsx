"use client";

// Internal-only screen index — handy for QA at mobile viewport.
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const SECTIONS: Array<{ title: string; routes: { href: string; label: string }[] }> = [
  {
    title: "intro",
    routes: [
      { href: "/onboarding/welcome", label: "welcome carousel" },
      { href: "/onboarding/in", label: "you are in" },
    ],
  },
  {
    title: "auth",
    routes: [{ href: "/auth/signin", label: "sign in" }],
  },
  {
    title: "onboarding",
    routes: [
      { href: "/onboarding/name", label: "1 · name" },
      { href: "/onboarding/birthday", label: "2 · birthday" },
      { href: "/onboarding/topics", label: "3 · topics" },
      { href: "/onboarding/notifications", label: "4 · notifications" },
      { href: "/onboarding/voice", label: "5 · voice" },
      { href: "/onboarding/loading", label: "personalizing" },
      { href: "/paywall", label: "paywall" },
    ],
  },
  {
    title: "main app",
    routes: [
      { href: "/home", label: "today / home" },
      { href: "/explore", label: "explore" },
      { href: "/entries", label: "entries" },
      { href: "/entries/1", label: "entry detail" },
      { href: "/entries/active", label: "post-session color" },
      { href: "/patterns", label: "patterns" },
    ],
  },
  {
    title: "chat",
    routes: [
      { href: "/chat/text", label: "text chat" },
      { href: "/chat/voice", label: "voice chat" },
      { href: "/chat/video", label: "video avatar (anam)" },
      { href: "/chat/loading", label: "fetching insights" },
    ],
  },
  {
    title: "tools",
    routes: [
      { href: "/mood", label: "mood picker" },
      { href: "/people", label: "people tag" },
      { href: "/ghost", label: "ghost mode" },
    ],
  },
  {
    title: "settings",
    routes: [
      { href: "/profile", label: "profile" },
      { href: "/profile/passcode", label: "passcode" },
      { href: "/profile/feedback", label: "feedback" },
      { href: "/credits", label: "credits / plans" },
      { href: "/referrals", label: "referrals" },
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
