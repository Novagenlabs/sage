"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronRight,
  Lock,
  Bell,
  HelpCircle,
  MessageSquare,
  CreditCard,
  Gift,
  Moon,
  LogOut,
} from "lucide-react";
import { TabBar } from "@/components/v2/tab-bar";
import { SageMark } from "@/components/v2/sage-mark";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // Important: keep all hooks above any early return so the hook order
  // stays stable across renders (rules of hooks).
  const ghostOn = useGhostMirror();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/v2/auth/signin?next=/v2/profile");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-[100dvh] bg-chamber-900 flex items-center justify-center">
        <SageMark size={48} animated />
      </div>
    );
  }

  const user = session.user as {
    id?: string;
    name?: string | null;
    email?: string | null;
    credits?: number;
  };

  const firstName = user.name?.split(" ")[0]?.toLowerCase() ?? "you";
  const credits = user.credits ?? 0;

  return (
    <div className="min-h-[100dvh] bg-chamber-900 pb-28 lg:pb-16">
      <div className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] lg:max-w-2xl lg:mx-auto lg:pt-12 lg:px-4">
        {/* Hero */}
        <div className="text-center mb-8 lg:text-left lg:flex lg:items-center lg:gap-5 lg:mb-12">
          <div className="inline-flex items-center justify-center mb-3 lg:mb-0 lg:flex-shrink-0">
            <SageMark size={64} animated />
          </div>
          <div>
            <h1 className="font-display text-3xl lowercase lg:text-4xl">
              {firstName}
            </h1>
            <p className="text-sm text-chamber-400 mt-1 lowercase">
              {user.email}
            </p>
          </div>
        </div>

        {/* Credits banner */}
        <Link
          href="/v2/credits"
          className="block rounded-3xl p-5 mb-6 v2-grad-trial text-chamber-900"
        >
          <p className="text-xs uppercase tracking-widest mb-1">your balance</p>
          <h2 className="font-display text-3xl tracking-tight lowercase mb-1">
            {credits.toLocaleString()} credits
          </h2>
          <p className="text-sm">
            {credits < 50
              ? "running low — tap to top up →"
              : "tap to view plans and top-ups →"}
          </p>
        </Link>

        <Section title="account">
          <Row icon={<Lock className="h-4 w-4" />} label="passcode" href="/v2/profile/passcode" />
          <Row icon={<Bell className="h-4 w-4" />} label="reminders" href="/v2/onboarding/notifications" />
          <Row icon={<Moon className="h-4 w-4" />} label="ghost mode" href="/v2/ghost" rightLabel={ghostOn ? "on" : "off"} />
        </Section>

        <Section title="plan">
          <Row icon={<CreditCard className="h-4 w-4" />} label="subscription" href="/v2/credits" rightLabel={`${credits}`} />
          <Row icon={<Gift className="h-4 w-4" />} label="invite a friend" href="/v2/referrals" rightLabel="earn 120" />
        </Section>

        <Section title="sage">
          <Row icon={<HelpCircle className="h-4 w-4" />} label="help" href="#" />
          <Row icon={<MessageSquare className="h-4 w-4" />} label="feedback" href="/v2/profile/feedback" />
        </Section>

        <button
          onClick={() => signOut({ callbackUrl: "/v2/auth/signin" })}
          className="w-full flex items-center justify-center gap-2 py-4 text-sm text-chamber-500 lowercase"
        >
          <LogOut className="h-4 w-4" />
          sign out
        </button>
      </div>

      <TabBar />
    </div>
  );
}

// Mirrors the localStorage flag so the profile row reflects the live state
// without needing to import the chat hook.
function useGhostMirror() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(localStorage.getItem("sage-ghost-mode") === "1");
    } catch {
      /* ignore */
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sage-ghost-mode") setOn(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return on;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-chamber-500 mb-2 px-1">
        {title}
      </p>
      <div className="rounded-2xl bg-chamber-800/40 border border-chamber-800 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  href,
  rightLabel,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  rightLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-chamber-800/40 active:bg-chamber-800/70 transition-colors border-b border-chamber-800 last:border-0"
    >
      <span className="text-chamber-300">{icon}</span>
      <span className="flex-1 text-chamber-100 lowercase">{label}</span>
      {rightLabel && <span className="text-xs text-chamber-500 lowercase">{rightLabel}</span>}
      <ChevronRight className="h-4 w-4 text-chamber-600" />
    </Link>
  );
}
