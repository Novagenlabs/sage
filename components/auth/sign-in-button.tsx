"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";

export function SignInButton() {
  return (
    <Link
      href="/auth/signin"
      className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm font-medium text-white/90 transition-colors"
    >
      <LogIn className="w-4 h-4" />
      <span>Sign in</span>
    </Link>
  );
}
