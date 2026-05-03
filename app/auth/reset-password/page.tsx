"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { SageMark } from "@/components/v2/sage-mark";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="v2-screen bg-chamber-900 px-6 pt-[calc(env(safe-area-inset-top)+1rem)] items-center justify-center">
        <div className="v2-card text-center max-w-sm">
          <p className="text-sm text-chamber-200 leading-relaxed">
            this reset link is missing its token. ask for a fresh one.
          </p>
          <Link
            href="/auth/forgot-password"
            className="mt-6 inline-block text-ember-400 hover:underline lowercase text-sm"
          >
            request a new link
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (password.length < 6) {
      setErr("password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setErr(
          data.error || "this link is invalid or expired. ask for a fresh one."
        );
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/auth/signin"), 1500);
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

      <h1 className="v2-h1 text-center mb-2">choose a new password</h1>
      <p className="v2-sub text-center mb-10">at least 6 characters.</p>

      {done ? (
        <div className="v2-card text-center">
          <p className="text-sm text-chamber-200 leading-relaxed">
            password updated. taking you to sign in...
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-chamber-500 mb-2">
              new password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full bg-chamber-800/60 border border-chamber-700 rounded-2xl px-4 py-3.5 pr-12 text-base text-chamber-50 placeholder:text-chamber-500 focus:outline-none focus:border-ember-500/60 focus:bg-chamber-800"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-chamber-400"
                tabIndex={-1}
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-chamber-500 mb-2">
              confirm
            </label>
            <input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full bg-chamber-800/60 border border-chamber-700 rounded-2xl px-4 py-3.5 text-base text-chamber-50 placeholder:text-chamber-500 focus:outline-none focus:border-ember-500/60 focus:bg-chamber-800"
            />
          </div>
          {err && <p className="text-sm text-red-400 lowercase">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="v2-btn v2-btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                updating...
              </>
            ) : (
              "update password"
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="v2-screen bg-chamber-900" />}>
      <ResetForm />
    </Suspense>
  );
}
