"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus,
  Pencil,
  Flame,
  AudioLines,
  Video,
  ScrollText,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { TabBar } from "@/components/v2/tab-bar";
import { SageMark } from "@/components/v2/sage-mark";
import { VoiceOrb } from "@/components/voice-orb-3d";

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

type Convo = {
  id: string;
  title: string | null;
  summary: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const ENTRY_COLORS = [
  "bg-ember-500/40",
  "bg-gold-400/40",
  "bg-plum-400/40",
  "bg-bloom-400/40",
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [streak, setStreak] = useState(0);
  const [recent, setRecent] = useState<Convo[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?next=/home");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : []))
      .then((convos: Convo[]) => {
        const days = new Set(
          convos.map((c) => new Date(c.createdAt).toDateString())
        );
        setStreak(days.size);
        setRecent(convos.slice(0, 4));
      })
      .catch(() => {
        setStreak(0);
        setRecent([]);
      });
  }, [status]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-[100dvh] bg-chamber-900 flex items-center justify-center">
        <SageMark size={64} animated />
      </div>
    );
  }

  const firstName =
    session?.user?.name?.split(" ")[0]?.toLowerCase() ?? "you";
  const greeting = timeOfDayGreeting();

  // mon..sun row, with today highlighted
  const week = ["m", "t", "w", "t", "f", "s", "s"];
  const jsDay = new Date().getDay(); // 0=sun
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;

  return (
    <>
      {/* ====== MOBILE (default, hides on lg) ====== */}
      <MobileHome
        firstName={firstName}
        greeting={greeting}
        streak={streak}
        week={week}
        todayIdx={todayIdx}
        credits={(session?.user as { credits?: number })?.credits ?? 0}
      />

      {/* ====== DESKTOP (shown only on lg) ====== */}
      <DesktopHome
        firstName={firstName}
        greeting={greeting}
        streak={streak}
        recent={recent}
      />
    </>
  );
}

function MobileHome({
  firstName,
  greeting,
  streak,
  week,
  todayIdx,
  credits,
}: {
  firstName: string;
  greeting: string;
  streak: number;
  week: string[];
  todayIdx: number;
  credits: number;
}) {
  return (
    <div className="lg:hidden relative min-h-[100dvh] v2-mood-bg pb-28">
      {/* Top status row */}
      <div className="flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-4">
        <Link href="/profile" className="v2-streak">
          <Flame className="h-3 w-3 fill-current" />
          {streak}
        </Link>

        <div className="flex gap-2">
          {week.map((_d, i) => {
            const done = i < todayIdx;
            const isToday = i === todayIdx;
            return (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  done
                    ? "bg-ember-500"
                    : isToday
                    ? "ring-2 ring-ember-400"
                    : "bg-chamber-700"
                }`}
              />
            );
          })}
        </div>

        <span className="w-6" />
      </div>

      <div className="px-3">
        <div className="relative rounded-[28px] overflow-hidden h-[58vh] min-h-[480px] bg-chamber-800/40 border border-chamber-800 backdrop-blur-md">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-[26%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(224,124,56,0.45) 0%, rgba(224,124,56,0.15) 40%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />
          </div>

          <div className="absolute top-[12%] left-1/2 -translate-x-1/2">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <VoiceOrb state="idle" size={200} />
            </motion.div>
          </div>

          <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-chamber-900/70 px-3 py-1.5 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-ember-500 shadow-[0_0_8px_rgba(224,124,56,0.6)]" />
            <span className="text-xs text-chamber-100 lowercase">
              {credits} credits
            </span>
          </div>

          <Link
            href="/chat/text?fresh=1"
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-chamber-900/60 backdrop-blur text-chamber-200 flex items-center justify-center"
            aria-label="new entry"
          >
            <Plus className="h-4 w-4" />
          </Link>

          <div className="absolute left-6 right-6 bottom-32">
            <p className="text-sm text-chamber-200 mb-2 lowercase">
              {greeting}, {firstName}.
            </p>
            <h1 className="font-display text-3xl text-chamber-50 leading-tight tracking-tight lowercase">
              what would you like to{" "}
              <span className="text-ember-400">explore</span>?
            </h1>
          </div>

          <div className="absolute left-0 right-0 bottom-6 flex justify-center gap-8">
            <Link href="/chat/text?fresh=1" className="v2-action">
              <span className="v2-action-orb">
                <Pencil className="h-5 w-5" />
              </span>
              <span className="v2-action-label">type</span>
            </Link>
            <Link href="/chat/voice" className="v2-action">
              <span className="v2-action-orb v2-action-orb-primary bg-chamber-950 text-white ring-1 ring-chamber-700/60 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)]">
                <AudioLines className="h-6 w-6" strokeWidth={2.2} />
              </span>
              <span className="v2-action-label">talk</span>
            </Link>
            <Link href="/chat/video" className="v2-action relative">
              <span className="v2-action-orb">
                <Video className="h-5 w-5" />
              </span>
              <span className="absolute -top-1 -right-1 rounded-full bg-ember-500/90 text-white text-[8px] uppercase tracking-widest px-1.5 py-0.5 leading-none">
                beta
              </span>
              <span className="v2-action-label">see</span>
            </Link>
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  );
}

function DesktopHome({
  firstName,
  greeting,
  streak,
  recent,
}: {
  firstName: string;
  greeting: string;
  streak: number;
  recent: Convo[];
}) {
  return (
    <div className="hidden lg:block v2-page-full pt-12 pb-16">
      <div className="grid grid-cols-12 gap-8">
        {/* Left: orb + greeting + entry actions */}
        <section className="col-span-7">
          <div className="rounded-3xl border border-chamber-800 bg-chamber-800/30 backdrop-blur-md overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(224,124,56,0.35) 0%, rgba(224,124,56,0.1) 45%, transparent 75%)",
                  filter: "blur(30px)",
                }}
              />
            </div>

            <div className="relative grid grid-cols-2 gap-8 p-12">
              <div className="flex items-center justify-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <VoiceOrb state="idle" size={280} />
                </motion.div>
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-sm text-chamber-300 mb-2 lowercase">
                  {greeting}, {firstName}.
                </p>
                <h1 className="font-display text-5xl text-chamber-50 leading-tight tracking-tight lowercase mb-3">
                  what would you like to{" "}
                  <span className="text-ember-400">explore</span>?
                </h1>
                <p className="text-base text-chamber-400 lowercase mb-8 max-w-md">
                  start a session — type something out, talk it through, or see
                  sage face-to-face.
                </p>

                <div className="flex flex-col gap-3 max-w-md">
                  <DesktopAction
                    href="/chat/text?fresh=1"
                    icon={<Pencil className="h-5 w-5" />}
                    label="type"
                    sub="best for thinking out loud in writing"
                    primary={false}
                  />
                  <DesktopAction
                    href="/chat/voice"
                    icon={<AudioLines className="h-5 w-5" />}
                    label="talk"
                    sub="real-time voice with sage"
                    primary
                  />
                  <DesktopAction
                    href="/chat/video"
                    icon={<Video className="h-5 w-5" />}
                    label="see"
                    sub="video avatar (uses ~3× credits)"
                    primary={false}
                    beta
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: streak + recent entries */}
        <aside className="col-span-5 flex flex-col gap-5">
          <div className="rounded-3xl border border-chamber-800 bg-chamber-800/30 p-6">
            <p className="text-xs uppercase tracking-widest text-chamber-500 mb-3">
              this week
            </p>
            <div className="flex items-end gap-4">
              <span className="font-display text-5xl text-ember-400 tabular-nums">
                {streak}
              </span>
              <span className="text-sm text-chamber-400 lowercase mb-2">
                {streak === 1 ? "session" : "sessions"} so far
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-chamber-800 bg-chamber-800/30 p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-chamber-500">
                recent entries
              </p>
              <Link
                href="/entries"
                className="inline-flex items-center gap-1 text-xs text-chamber-400 hover:text-chamber-100 lowercase"
              >
                see all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center text-center py-8">
                <ScrollText className="h-8 w-8 text-chamber-600 mb-3" />
                <p className="text-sm text-chamber-500 lowercase">
                  your entries will land here.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recent.map((c, i) => (
                  <li key={c.id}>
                    <Link
                      href={`/entries/${c.id}`}
                      className="flex items-start gap-3 rounded-2xl px-3 py-2.5 hover:bg-chamber-800/60 transition-colors"
                    >
                      <span
                        className={`mt-1 h-7 w-7 rounded-full flex-shrink-0 ${
                          ENTRY_COLORS[i % ENTRY_COLORS.length]
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-chamber-100 truncate lowercase">
                          {c.title || "untitled entry"}
                        </p>
                        {c.summary && (
                          <p className="text-xs text-chamber-500 truncate">
                            {c.summary}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DesktopAction({
  href,
  icon,
  label,
  sub,
  primary,
  beta,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  primary?: boolean;
  beta?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-2xl px-5 py-4 border transition-all relative ${
        primary
          ? "bg-ember-500 hover:bg-ember-600 text-white border-ember-500 shadow-[0_8px_24px_-8px_rgba(224,124,56,0.5)]"
          : "bg-chamber-800/50 hover:bg-chamber-800 text-chamber-100 border-chamber-700"
      }`}
    >
      <span
        className={`h-11 w-11 rounded-full flex items-center justify-center ${
          primary ? "bg-white/15" : "bg-chamber-700/70"
        }`}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium lowercase inline-flex items-center gap-2">
          {label}
          {beta && (
            <span className="rounded-full bg-ember-500/90 text-white text-[8px] uppercase tracking-widest px-1.5 py-0.5 leading-none">
              beta
            </span>
          )}
        </p>
        <p
          className={`text-xs lowercase ${
            primary ? "text-white/80" : "text-chamber-400"
          }`}
        >
          {sub}
        </p>
      </div>
      <ArrowRight
        className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${
          primary ? "text-white" : "text-chamber-400"
        }`}
      />
    </Link>
  );
}
