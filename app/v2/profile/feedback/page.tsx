"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Send, Loader2, Check } from "lucide-react";

export default function FeedbackPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    const message = text.trim();
    if (!message || submitting) return;
    setSubmitting(true);
    setErr("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "couldn't send. try again.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/v2/profile"), 1400);
    } catch {
      setErr("couldn't send. try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="v2-screen bg-chamber-900">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/v2/profile"
          className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </Link>
        <span className="inline-flex items-center gap-1.5 text-sm text-chamber-200 lowercase">
          ✏ feedback
        </span>
        <span className="w-9" />
      </div>

      <h1 className="font-display text-5xl tracking-tight lowercase mb-3">
        feedback
      </h1>
      <p className="text-sm text-chamber-300 mb-6 leading-relaxed">
        share your feedback, ideas, or suggestions — we&apos;re a small but
        mighty team pouring our hearts into making sage better every day.
        your feedback&apos;s a secret... unless you&apos;re down to chat.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="report a bug, share an idea..."
        rows={6}
        disabled={submitting || done}
        className="w-full bg-transparent text-chamber-50 placeholder:text-chamber-500 focus:outline-none text-base leading-relaxed mb-8 resize-none border-b border-chamber-800 pb-3 disabled:opacity-60"
      />

      {err && (
        <p className="text-sm text-red-400 lowercase mb-4">{err}</p>
      )}

      <div className="flex-1" />

      <div className="space-y-3">
        <p className="text-xs text-chamber-400 lowercase">
          drop your email for a reply (optional, ofc)
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={submitting || done}
          className="w-full bg-transparent text-chamber-50 placeholder:text-chamber-500 focus:outline-none border-b border-chamber-800 py-2 disabled:opacity-60"
        />

        <div className="flex justify-end items-center gap-3 mt-4">
          <button
            onClick={submit}
            disabled={!text.trim() || submitting || done}
            className="v2-btn v2-btn-primary disabled:opacity-50"
          >
            {done ? (
              <>
                <Check className="h-4 w-4" strokeWidth={3} />
                sent
              </>
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
