"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { SageMark } from "@/components/v2/sage-mark";
import { VoiceOrb } from "@/components/voice-orb-3d";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (password.length < 6) {
      setErr("password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const referralCode =
        typeof window !== "undefined"
          ? localStorage.getItem("sage_referral_code")
          : null;

      // Honour any name typed during the unauth onboarding flow.
      const pendingName =
        typeof window !== "undefined"
          ? localStorage.getItem("sage-pending-name")
          : null;
      const finalName = name?.trim() || pendingName?.trim() || null;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: finalName,
          referralCode,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "could not create account");
        setLoading(false);
        return;
      }

      // auto sign-in after register
      await signIn("credentials", { email, password, redirect: false });
      // Clear the stash now that the name lives on User.name.
      try {
        localStorage.removeItem("sage-pending-name");
      } catch {
        /* ignore */
      }
      router.push("/onboarding/in");
      router.refresh();
    } catch {
      setErr("something went wrong. try again.");
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
            a place to actually think.
          </h2>
          <p className="text-base text-chamber-300 lowercase leading-relaxed">
            sessions stay yours. transcripts aren&apos;t stored — only the
            patterns. talk, type, or see sage face-to-face.
          </p>
        </div>
      </aside>

      <div className="v2-screen bg-chamber-900 lg:min-h-[100dvh] lg:max-w-md lg:mx-auto lg:px-8 lg:justify-center">
        <Link
          href="/auth/signin"
          className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center mb-8 lg:hidden"
          aria-label="back"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center mb-8 lg:items-start"
        >
          <div className="lg:hidden">
            <SageMark size={72} animated />
          </div>
          <h1 className="font-display text-3xl tracking-tight lowercase mt-6 lg:text-4xl lg:mt-0">
            create your sage
          </h1>
          <p className="text-sm text-chamber-400 mt-2 lowercase">
            a place to actually think.
          </p>
        </motion.div>

      <form onSubmit={submit} className="space-y-4">
        {err && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300 lowercase text-center">
            {err}
          </div>
        )}

        <Field
          label="name"
          value={name}
          onChange={setName}
          placeholder="what should sage call you?"
          autoComplete="name"
        />
        <Field
          label="email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />

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
              autoComplete="new-password"
              placeholder="6+ characters"
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="v2-btn v2-btn-primary w-full mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              creating...
            </>
          ) : (
            "create account"
          )}
        </button>
      </form>

        <div className="flex-1 lg:hidden" />

        <p className="text-center text-sm text-chamber-400 lowercase mt-8 lg:text-left">
          already have one?{" "}
          <Link href="/auth/signin" className="text-ember-400 hover:underline">
            sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-chamber-500 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full bg-chamber-800/60 border border-chamber-700 rounded-2xl px-4 py-3.5 text-base text-chamber-50 placeholder:text-chamber-500 focus:outline-none focus:border-ember-500/60 focus:bg-chamber-800"
      />
    </div>
  );
}
