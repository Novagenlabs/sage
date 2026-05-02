"use client";

// v2 splash screen — auto-routes to /v2/onboarding/welcome after 1.5s
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SageMark } from "@/components/v2/sage-mark";
import Link from "next/link";

export default function V2Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/v2/onboarding/welcome"), 1800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="v2-screen items-center justify-center bg-zest-300 text-chamber-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <SageMark size={88} className="text-chamber-900" />
        <span className="font-display text-5xl tracking-tight lowercase">
          sage
        </span>
      </motion.div>

      <Link
        href="/v2/onboarding/welcome"
        className="absolute bottom-12 text-sm text-chamber-900/60 lowercase"
      >
        tap to continue →
      </Link>
    </div>
  );
}
