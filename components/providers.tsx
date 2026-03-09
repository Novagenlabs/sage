"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/service-worker";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
