"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Delete, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const TARGET = 4;

export default function PasscodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [err, setErr] = useState("");

  // Trigger save when the user has typed all 4 digits.
  useEffect(() => {
    if (code.length !== TARGET || saving) return;
    (async () => {
      setSaving(true);
      setErr("");
      try {
        const res = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passcode: code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data.error || "couldn't save passcode");
          setCode("");
          return;
        }
        setSavedFlash(true);
        setTimeout(() => router.push("/v2/profile"), 900);
      } catch {
        setErr("couldn't save passcode");
        setCode("");
      } finally {
        setSaving(false);
      }
    })();
  }, [code, saving, router]);

  const press = (n: string) => {
    if (saving || savedFlash) return;
    if (code.length < TARGET) setCode((c) => c + n);
  };
  const back = () => {
    if (saving || savedFlash) return;
    setCode((c) => c.slice(0, -1));
  };

  const removePasscode = async () => {
    if (!confirm("remove your passcode lock?")) return;
    setSaving(true);
    setErr("");
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: "" }),
      });
      router.push("/v2/profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="v2-screen bg-chamber-900">
      <Link
        href="/v2/profile"
        className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      <h1 className="v2-h1 mb-2">
        {savedFlash ? "passcode set!" : "set a passcode"}
      </h1>
      <p className="v2-sub mb-10">
        4 digits. asked for whenever sage opens.
      </p>

      <div className="flex justify-between gap-3 px-2 mb-8">
        {Array.from({ length: TARGET }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ scale: code.length === i + 1 ? 1.05 : 1 }}
            className={`flex-1 h-20 rounded-full ${
              code.length > i
                ? "bg-ember-500"
                : "bg-chamber-800/60 border border-chamber-700"
            }`}
          />
        ))}
      </div>

      {err && (
        <p className="text-sm text-red-400 lowercase mb-4 text-center">{err}</p>
      )}

      {savedFlash && (
        <div className="flex justify-center mb-8">
          <div className="h-12 w-12 rounded-full bg-chamber-50 flex items-center justify-center text-chamber-900">
            <Check className="h-5 w-5" strokeWidth={3} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-y-4 gap-x-12 max-w-xs mx-auto mb-6">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <button
            key={n}
            onClick={() => press(n)}
            disabled={saving || savedFlash}
            className="text-3xl text-chamber-50 active:scale-95 transition py-2 disabled:opacity-30"
          >
            {n}
          </button>
        ))}
        <span />
        <button
          onClick={() => press("0")}
          disabled={saving || savedFlash}
          className="text-3xl text-chamber-50 active:scale-95 transition py-2 disabled:opacity-30"
        >
          0
        </button>
        <button
          onClick={back}
          disabled={saving || savedFlash}
          className="text-chamber-50 flex items-center justify-center disabled:opacity-30"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Delete className="h-6 w-6" />
          )}
        </button>
      </div>

      <div className="flex-1" />

      <button
        onClick={removePasscode}
        disabled={saving}
        className="w-full text-center text-sm text-chamber-500 lowercase py-3 disabled:opacity-50 hover:text-red-400"
      >
        remove passcode
      </button>
    </div>
  );
}
