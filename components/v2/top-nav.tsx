"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Home,
  Compass,
  ScrollText,
  Layers,
  Flame,
  ChevronDown,
  LogOut,
  CreditCard,
  Gift,
  HelpCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { SageMark } from "./sage-mark";

const TABS = [
  { href: "/v2/home", label: "today", icon: Home },
  { href: "/v2/explore", label: "explore", icon: Compass },
  { href: "/v2/entries", label: "entries", icon: ScrollText },
  { href: "/v2/patterns", label: "patterns", icon: Layers },
];

// Routes where the desktop top nav would get in the way.
const HIDE_ON_PREFIXES = [
  "/v2/auth",
  "/v2/onboarding",
  "/v2/chat", // chat surfaces have their own headers
  "/v2/paywall",
  "/v2/ghost",
  "/v2/mood",
  "/v2/people",
];

export function TopNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Important: this useEffect must run on every render (rules of hooks).
  // We early-return below for hidden routes — keep all hook calls above it.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const shouldHide =
    !pathname ||
    pathname === "/v2" ||
    HIDE_ON_PREFIXES.some((p) => pathname.startsWith(p)) ||
    status !== "authenticated";

  if (shouldHide) return null;

  const user = session?.user as
    | { name?: string | null; email?: string | null; credits?: number }
    | undefined;
  const firstName = user?.name?.split(" ")[0]?.toLowerCase() ?? "you";
  const credits = user?.credits ?? 0;

  return (
    <nav className="v2-topnav">
      <Link href="/v2/home" className="inline-flex items-center gap-2.5">
        <SageMark size={28} animated />
        <span className="font-display text-2xl tracking-tight lowercase">
          sage
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {TABS.map((t) => {
          const active =
            pathname === t.href || pathname?.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={clsx(
                "v2-topnav-link",
                active && "v2-topnav-link-active"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/v2/credits"
          className="inline-flex items-center gap-1.5 rounded-full bg-chamber-800/60 px-3 py-1.5 text-xs text-chamber-200 hover:bg-chamber-800 lowercase"
        >
          <Flame className="h-3 w-3 text-ember-400" />
          {credits.toLocaleString()} credits
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((m) => !m)}
            className="inline-flex items-center gap-2 rounded-full bg-chamber-800/60 px-3 py-1.5 text-sm text-chamber-100 hover:bg-chamber-800"
          >
            <span className="h-6 w-6 rounded-full bg-ember-500 flex items-center justify-center text-white text-xs font-medium">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            <span className="lowercase">{firstName}</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-chamber-800 bg-chamber-900/95 backdrop-blur-xl shadow-xl overflow-hidden">
              <Link
                href="/v2/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-chamber-100 hover:bg-chamber-800/60"
              >
                <span className="h-7 w-7 rounded-full bg-ember-500 flex items-center justify-center text-white text-xs">
                  {firstName.slice(0, 1).toUpperCase()}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="lowercase">{firstName}</span>
                  <span className="text-[11px] text-chamber-500 truncate">
                    {user?.email}
                  </span>
                </div>
              </Link>
              <div className="border-t border-chamber-800" />
              <MenuItem
                href="/v2/credits"
                icon={<CreditCard className="h-4 w-4" />}
                label="credits"
              />
              <MenuItem
                href="/v2/referrals"
                icon={<Gift className="h-4 w-4" />}
                label="invite a friend"
              />
              <MenuItem
                href="/v2/profile/feedback"
                icon={<HelpCircle className="h-4 w-4" />}
                label="feedback"
              />
              <div className="border-t border-chamber-800" />
              <button
                onClick={() => signOut({ callbackUrl: "/v2/auth/signin" })}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-chamber-300 hover:bg-chamber-800/60"
              >
                <LogOut className="h-4 w-4" />
                <span className="lowercase">sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function MenuItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-chamber-200 hover:bg-chamber-800/60 lowercase"
    >
      {icon}
      {label}
    </Link>
  );
}
