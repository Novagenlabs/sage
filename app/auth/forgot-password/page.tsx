"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ChevronLeft } from "lucide-react";
import { SageMark } from "@/components/v2/sage-mark";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setErr(data.error || "couldn't send the reset email. try again.");
        return;
      }
      setSent(true);
    } catch {
      setErr("network error. try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v2-screen bg-chamber-900 px-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <Link
        href="/auth/signin"
        className="inline-flex items-center gap-1 text-chamber-400 hover:text-chamber-100 lowercase text-sm mb-8"
      >
        <ChevronLeft className="h-4 w-4" />
        back
      </Link>

      <div className="flex justify-center mb-8">
        <SageMark size={56} className="text-chamber-50" />
      </div>

      <h1 className="v2-h1 text-center mb-2">reset your password</h1>
      <p className="v2-sub text-center mb-10">
        we&apos;ll email you a link to choose a new one.
      </p>

      {sent ? (
        <div className="v2-card text-center">
          <p className="text-sm text-chamber-200 leading-relaxed">
            if that email is registered, we&apos;ve sent a link to reset your
            password. check your inbox (and spam folder, just in case).
          </p>
          <Link
            href="/auth/signin"
            className="mt-6 inline-block text-ember-400 hover:underline lowercase text-sm"
          >
            back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
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
          {err && (
            <p className="text-sm text-red-400 lowercase">{err}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="v2-btn v2-btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                sending...
              </>
            ) : (
              "send reset link"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
