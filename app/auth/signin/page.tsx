"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { SageMark } from "@/components/v2/sage-mark";
import { VoiceOrb } from "@/components/voice-orb-3d";

function SigninForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setErr("invalid email or password");
      } else {
        router.push(next);
        router.refresh();
      }
    } catch {
      setErr("something went wrong. try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg:grid lg:grid-cols-2 lg:min-h-[100dvh]">
      {/* Desktop brand panel */}
      <aside className="hidden lg:flex relative overflow-hidden flex-col items-center justify-center px-12 bg-chamber-900">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(224,124,56,0.4) 0%, rgba(196,149,106,0.15) 40%, transparent 75%)",
              filter: "blur(40px)",
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <VoiceOrb state="idle" size={280} />
          <h2 className="font-display text-5xl tracking-tight lowercase mt-8 mb-3">
            think out loud.
          </h2>
          <p className="text-base text-chamber-300 lowercase leading-relaxed">
            sage listens, asks the questions worth asking, and helps you hear
            yourself more clearly.
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <div className="v2-screen bg-chamber-900 lg:min-h-[100dvh] lg:max-w-md lg:mx-auto lg:px-8 lg:justify-center">
        <Link
          href="/onboarding/welcome"
          className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center mb-8 lg:hidden"
          aria-label="back"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center mb-10 lg:items-start"
        >
          <div className="lg:hidden">
            <SageMark size={88} animated />
          </div>
          <h1 className="font-display text-3xl tracking-tight lowercase mt-6 lg:text-4xl lg:mt-0">
            welcome back
          </h1>
          <p className="text-sm text-chamber-400 mt-2 lowercase">
            sign in to keep going.
          </p>
        </motion.div>

        <form onSubmit={submit} className="space-y-4">
          {err && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300 lowercase text-center">
              {err}
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-widest text-chamber-500 mb-2">
              email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-chamber-800/60 border border-chamber-700 rounded-2xl px-4 py-3.5 text-base text-chamber-50 placeholder:text-chamber-500 focus:outline-none focus:border-ember-500/60 focus:bg-chamber-800"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-chamber-500 mb-2">
              password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-chamber-800/60 border border-chamber-700 rounded-2xl px-4 py-3.5 pr-12 text-base text-chamber-50 placeholder:text-chamber-500 focus:outline-none focus:border-ember-500/60 focus:bg-chamber-800"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-chamber-400"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Link
              href="/auth/forgot-password"
              className="block mt-2 text-xs text-chamber-400 hover:text-chamber-200 lowercase text-right"
            >
              forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="v2-btn v2-btn-primary w-full mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                signing in...
              </>
            ) : (
              "sign in"
            )}
          </button>
        </form>

        <div className="flex-1 lg:hidden" />

        <p className="text-center text-sm text-chamber-400 lowercase mt-8 lg:text-left">
          new here?{" "}
          <Link href="/auth/signup" className="text-ember-400 hover:underline">
            create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="v2-screen bg-chamber-900" />}>
      <SigninForm />
    </Suspense>
  );
}
