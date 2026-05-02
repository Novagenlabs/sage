"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SageMark } from "@/components/v2/sage-mark";

export default function LoadingPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/v2/paywall"), 2200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="v2-screen items-center justify-center bg-plum-500/30 relative overflow-hidden">
      <div className="absolute inset-0 -z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-plum-500/40 blur-3xl" />
      </div>

      <h1 className="v2-h1 mb-12 text-center relative z-10">welcome to sage!</h1>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="text-bloom-400 mb-12 relative z-10"
      >
        <SageMark size={120} />
      </motion.div>

      <div className="absolute bottom-12 left-6 right-6">
        <div className="rounded-full border border-chamber-700 bg-chamber-900/40 backdrop-blur px-5 py-3 text-center text-sm text-chamber-300 lowercase">
          personalizing your experience...
        </div>
      </div>
    </div>
  );
}
