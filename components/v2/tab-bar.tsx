"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, ScrollText, Layers } from "lucide-react";
import { clsx } from "clsx";

const TABS = [
  { href: "/v2/home", label: "today", icon: Home },
  { href: "/v2/explore", label: "explore", icon: Compass },
  { href: "/v2/entries", label: "entries", icon: ScrollText },
  { href: "/v2/patterns", label: "patterns", icon: Layers },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="v2-tabs">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname?.startsWith(tab.href + "/");
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx("v2-tab", active && "v2-tab-active")}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.6} />
            <span className="text-[10px] lowercase tracking-wide">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
