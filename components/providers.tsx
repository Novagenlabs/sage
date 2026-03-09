"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/service-worker";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();

    // Fade out and remove PWA splash screen
    const splash = document.getElementById("pwa-splash");
    if (splash) {
      splash.style.opacity = "0";
      setTimeout(() => splash.remove(), 300);
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
