"use client";

import { useSession } from "next-auth/react";
import { SignInButton } from "./sign-in-button";
import { UserMenu } from "./user-menu";

export function AuthHeader() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="w-24 h-10 bg-white/5 rounded-xl animate-pulse" />
    );
  }

  if (!session) {
    return <SignInButton />;
  }

  return <UserMenu session={session} />;
}
