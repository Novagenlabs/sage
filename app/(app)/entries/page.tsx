"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Loader2, AudioLines } from "lucide-react";
import { TabBar } from "@/components/v2/tab-bar";
import { SageMark } from "@/components/v2/sage-mark";
import { EntryDetailPane } from "@/components/v2/entry-detail-pane";

type Convo = {
  id: string;
  title: string | null;
  summary: string | null;
  phase: string;
  isActive: boolean;
  // Optional — legacy rows from before the schema bump won't have it.
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
};

const FALLBACK_COLORS = [
  "bg-ember-500/40",
  "bg-gold-400/40",
  "bg-plum-400/40",
  "bg-bloom-400/40",
  "bg-peach-500/40",
  "bg-sage-400/40",
];

const SAVED_COLOR_BG: Record<string, string> = {
  ember: "bg-ember-500/60",
  peach: "bg-peach-500/60",
  bloom: "bg-bloom-400/60",
  plum: "bg-plum-400/60",
  sage: "bg-sage-400/60",
  gold: "bg-gold-400/60",
};

function fmtDate(s: string) {
  const d = new Date(s);
  return d
    .toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toLowerCase();
}

function EntriesInner() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("id");

  const [convos, setConvos] = useState<Convo[] | null>(null);
  const [query, setQuery] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?next=/entries");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/conversations")
      .then(async (r) => {
        if (!r.ok) throw new Error("could not load entries");
        return r.json();
      })
      .then((data: Convo[]) => setConvos(data))
      .catch((e: Error) => setErr(e.message));
  }, [status]);

  if (status !== "authenticated" || convos === null) {
    return (
      <div className="min-h-[100dvh] bg-chamber-900 pb-28">
        <div className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] lg:hidden">
          <h1 className="font-display text-4xl tracking-tight lowercase text-chamber-300 mb-8">
            entries
          </h1>
        </div>
        <div className="flex justify-center pt-20">
          <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
        </div>
        <TabBar />
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-[100dvh] bg-chamber-900 pb-28 px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <h1 className="font-display text-4xl tracking-tight lowercase text-chamber-300 mb-8">
          entries
        </h1>
        <p className="text-sm text-red-400 lowercase">{err}</p>
        <TabBar />
      </div>
    );
  }

  // EMPTY STATE — same on mobile + desktop
  if (convos.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-chamber-900 pb-28 relative">
        <div className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] lg:max-w-3xl lg:mx-auto lg:pt-12">
          <h1 className="font-display text-4xl tracking-tight lowercase text-chamber-300 mb-2 lg:text-5xl">
            entries
          </h1>
        </div>
        <div className="flex flex-col items-start justify-center px-6 pt-16 max-w-sm lg:mx-auto lg:items-center lg:text-center lg:max-w-md">
          <div className="text-ember-400 mb-4">
            <SageMark size={56} animated />
          </div>
          <h2 className="font-display text-3xl tracking-tight lowercase mb-3">
            no entries yet
          </h2>
          <p className="text-chamber-300 leading-snug lowercase">
            entries here are sage's pattern-level reading of each
            conversation you have. talk with sage and the entry shows up
            once she's noticed something worth keeping.
          </p>
          <Link
            href="/home"
            className="hidden lg:inline-flex mt-6 v2-btn v2-btn-primary"
          >
            <AudioLines className="h-4 w-4" />
            start a session
          </Link>
        </div>
        <Link
          href="/home"
          aria-label="start a session"
          className="absolute bottom-32 right-6 v2-fab lg:hidden"
        >
          <AudioLines className="h-5 w-5" />
        </Link>
        <TabBar />
      </div>
    );
  }

  const filtered = convos.filter((c) =>
    [c.title, c.summary]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <>
      {/* ====== MOBILE — full-screen list, navigate to /entries/[id] ====== */}
      <div className="lg:hidden min-h-[100dvh] bg-chamber-900 pb-28">
        <div className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
          <h1 className="font-display text-4xl tracking-tight lowercase text-chamber-300 mb-4">
            entries
          </h1>

          <div className="flex items-center gap-2 bg-chamber-800/60 rounded-full px-4 py-2.5 mb-6">
            <Search className="h-4 w-4 text-chamber-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search your entries"
              className="flex-1 bg-transparent text-sm placeholder:text-chamber-500 focus:outline-none"
            />
          </div>

          <ListBody
            convos={filtered}
            selectedId={null}
            renderItem={(c, i) => (
              <Link
                key={c.id}
                href={`/entries/${c.id}`}
                className="block p-4 rounded-2xl bg-chamber-800/40 border border-chamber-800 hover:bg-chamber-800/70 active:scale-[0.99] transition-all"
              >
                <EntryRow c={c} i={i} />
              </Link>
            )}
            query={query}
          />
        </div>

        <Link
          href="/home"
          aria-label="start a session"
          className="fixed bottom-24 right-6 v2-fab z-40"
        >
          <AudioLines className="h-5 w-5" />
        </Link>

        <TabBar />
      </div>

      {/* ====== DESKTOP — master/detail split ====== */}
      <div className="hidden lg:block v2-page-full pt-12 pb-16">
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* List pane */}
          <section className="col-span-5 sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2">
            <div className="flex items-center justify-between mb-4">
              <h1 className="font-display text-4xl tracking-tight lowercase text-chamber-300">
                entries
              </h1>
              <Link
                href="/home"
                className="v2-btn v2-btn-primary !py-2 !px-4 text-sm"
              >
                <AudioLines className="h-3.5 w-3.5" />
                new session
              </Link>
            </div>

            <div className="flex items-center gap-2 bg-chamber-800/60 rounded-full px-4 py-2.5 mb-6">
              <Search className="h-4 w-4 text-chamber-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search your entries"
                className="flex-1 bg-transparent text-sm placeholder:text-chamber-500 focus:outline-none"
              />
            </div>

            <ListBody
              convos={filtered}
              selectedId={selectedId}
              renderItem={(c, i) => {
                const isSelected = selectedId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() =>
                      router.replace(`/entries?id=${c.id}`, {
                        scroll: false,
                      })
                    }
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-chamber-800 border-ember-500/40 shadow-[0_4px_24px_-12px_rgba(224,124,56,0.5)]"
                        : "bg-chamber-800/40 border-chamber-800 hover:bg-chamber-800/70"
                    }`}
                  >
                    <EntryRow c={c} i={i} />
                  </button>
                );
              }}
              query={query}
            />
          </section>

          {/* Detail pane */}
          <section className="col-span-7 sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto">
            {selectedId ? (
              <EntryDetailPane
                id={selectedId}
                onDeleted={() => {
                  // remove from local list, clear selection
                  setConvos((c) => c?.filter((x) => x.id !== selectedId) ?? c);
                  router.replace("/entries", { scroll: false });
                }}
              />
            ) : (
              <EmptyDetail />
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function EntryRow({ c, i }: { c: Convo; i: number }) {
  const colorClass =
    (c.color && SAVED_COLOR_BG[c.color]) ??
    FALLBACK_COLORS[i % FALLBACK_COLORS.length];
  return (
    <div className="flex items-start gap-3">
      <span
        className={`h-10 w-10 rounded-full flex-shrink-0 ${
          colorClass
        }`}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-chamber-50 truncate">
          {c.title || "untitled entry"}
        </h3>
        {c.summary && (
          <p className="text-sm text-chamber-400 truncate">{c.summary}</p>
        )}
        <p className="text-xs text-chamber-600 mt-1 lowercase">
          {fmtDate(c.updatedAt)}
          {c.isActive ? " · active" : ""}
        </p>
      </div>
    </div>
  );
}

function ListBody({
  convos,
  renderItem,
  query,
}: {
  convos: Convo[];
  selectedId: string | null;
  renderItem: (c: Convo, i: number) => React.ReactNode;
  query: string;
}) {
  if (convos.length === 0) {
    return (
      <p className="text-center text-sm text-chamber-500 py-12 lowercase">
        no entries match &ldquo;{query}&rdquo;
      </p>
    );
  }
  return <div className="space-y-3">{convos.map((c, i) => renderItem(c, i))}</div>;
}

function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-3xl border border-chamber-800 bg-chamber-800/20 py-24 px-8 min-h-[60vh]">
      <SageMark size={56} animated />
      <h2 className="font-display text-2xl tracking-tight lowercase mt-6 mb-2">
        select an entry
      </h2>
      <p className="text-sm text-chamber-400 lowercase max-w-xs">
        pick something from the list to read its summary and the patterns
        sage noticed.
      </p>
    </div>
  );
}

export default function EntriesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-chamber-900 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-chamber-500" />
        </div>
      }
    >
      <EntriesInner />
    </Suspense>
  );
}
