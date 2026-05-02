"use client";

import Link from "next/link";
import { useState } from "react";
import { X, Check, Users } from "lucide-react";

const PREVIOUS = ["alex", "mom", "dad", "sam k.", "the team"];

export default function PeoplePage() {
  const [name, setName] = useState("");
  const [tagged, setTagged] = useState<string[]>([]);

  const add = (n: string) => {
    if (!n.trim() || tagged.includes(n)) return;
    setTagged([...tagged, n]);
    setName("");
  };

  return (
    <div className="v2-screen bg-chamber-900">
      <Link
        href="/entries/active"
        className="h-9 w-9 rounded-full bg-chamber-800 flex items-center justify-center mb-4"
      >
        <X className="h-4 w-4" />
      </Link>

      <h1 className="font-display text-5xl tracking-tight lowercase mb-6">people</h1>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add(name)}
        placeholder="type to add new name"
        autoFocus
        className="w-full bg-transparent text-chamber-50 placeholder:text-chamber-500 text-base focus:outline-none border-b border-chamber-800 pb-3 mb-8"
      />

      {tagged.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-chamber-300 lowercase mb-2">in this entry</p>
          <div className="flex flex-wrap gap-2">
            {tagged.map((t) => (
              <button
                key={t}
                onClick={() => setTagged(tagged.filter((x) => x !== t))}
                className="inline-flex items-center gap-1.5 rounded-full bg-chamber-800 px-3 py-1.5 text-sm text-chamber-50"
              >
                <Users className="h-3 w-3" /> {t} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm text-chamber-300 lowercase mb-2">previously mentioned</p>
        <div className="flex flex-wrap gap-2">
          {PREVIOUS.map((p) => (
            <button
              key={p}
              onClick={() => add(p)}
              className="inline-flex items-center gap-1.5 rounded-full bg-chamber-800/60 px-3 py-1.5 text-sm text-chamber-200"
            >
              <Users className="h-3 w-3" /> {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex justify-end">
        <Link
          href="/entries/active"
          className="h-12 w-12 rounded-full bg-chamber-50 text-chamber-900 flex items-center justify-center"
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </Link>
      </div>
    </div>
  );
}
