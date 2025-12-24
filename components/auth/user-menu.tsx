"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, Coins, User, Settings } from "lucide-react";
import type { Session } from "next-auth";

interface UserMenuProps {
  session: Session;
}

export function UserMenu({ session }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const credits = session.user?.credits ?? 0;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
      >
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || "User"}
            className="w-7 h-7 rounded-full"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center">
            <User className="w-4 h-4 text-white/70" />
          </div>
        )}
        <div className="flex items-center gap-1.5 text-sm">
          <Coins className="w-4 h-4 text-amber-400/80" />
          <span className="text-white/80 font-medium">{credits.toLocaleString()}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-stone-900 border border-stone-700/50 rounded-xl shadow-xl shadow-black/30 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-stone-700/50">
            <p className="text-sm font-medium text-white/90 truncate">
              {session.user?.name || "User"}
            </p>
            <p className="text-xs text-white/50 truncate">
              {session.user?.email}
            </p>
          </div>

          <div className="px-4 py-3 border-b border-stone-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Credits</span>
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400/80" />
                <span className="text-sm font-medium text-white/90">
                  {credits.toLocaleString()}
                </span>
              </div>
            </div>
            <button className="w-full mt-3 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-sm font-medium text-amber-400 transition-colors">
              Buy Credits
            </button>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              router.push("/profile");
            }}
            className="w-full px-4 py-3 flex items-center gap-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors border-b border-stone-700/50"
          >
            <Settings className="w-4 h-4" />
            <span>Profile Settings</span>
          </button>

          <button
            onClick={() => signOut()}
            className="w-full px-4 py-3 flex items-center gap-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
