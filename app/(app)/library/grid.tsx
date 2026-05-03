"use client";

// Client island for the /library page. Owns:
//   - the type filter chips (all / book / lecture / podcast / video / article / audiobook)
//   - the search box state
//   - the player sheet (re-uses <ResourcePlayer>)
//
// Visual direction: editorial reading room. Big italic Cormorant header,
// asymmetric grid where the first card on lg+ spans 2 columns and gets a
// taller cover, generous whitespace between rows.

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Search, X, Play } from "lucide-react";
import { ResourceCover } from "@/components/v2/resource-cover";
import { ResourcePlayer } from "@/components/v2/resource-player";
import type { ResourceType, RecommendationPayload } from "@/lib/recommendations/types";

export interface LibraryResource {
  id: string;
  type: ResourceType;
  title: string;
  author: string | null;
  url: string;
  blurb: string;
  themes: string[];
  audioUrl: string | null;
}

const FILTERS: Array<{ key: "all" | ResourceType; label: string }> = [
  { key: "all", label: "all" },
  { key: "book", label: "books" },
  { key: "lecture", label: "lectures" },
  { key: "podcast", label: "podcasts" },
  { key: "video", label: "videos" },
  { key: "article", label: "articles" },
  { key: "audiobook", label: "audiobooks" },
];

export function LibraryGrid({ resources }: { resources: LibraryResource[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<LibraryResource | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (filter !== "all" && r.type !== filter) return false;
      if (!q) return true;
      const hay = [r.title, r.author ?? "", r.blurb, r.themes.join(" ")]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [resources, filter, query]);

  return (
    <div className="min-h-[100dvh] bg-chamber-900 text-chamber-50 pb-32">
      {/* Subtle ambient glow at the top — sets the warm tone before any
          card has rendered. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] -z-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 h-[480px] w-[820px] rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(224,124,56,0.35) 0%, rgba(196,149,106,0.12) 45%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] lg:px-10 lg:pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 lg:mb-16">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-chamber-400 hover:text-chamber-100 lowercase text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            home
          </Link>
          <p className="text-[10px] uppercase tracking-[0.32em] text-chamber-500">
            sage's library
          </p>
          <span className="w-12" />
        </div>

        {/* Editorial title — italic Cormorant with a gold underline rule */}
        <header className="mb-10 lg:mb-16">
          <h1 className="font-display italic text-5xl sm:text-6xl lg:text-7xl tracking-tight text-chamber-50 leading-[0.95]">
            things worth
            <br />
            sitting with.
          </h1>
          <p className="mt-6 max-w-xl text-base text-chamber-300 leading-relaxed lg:text-lg">
            books, lectures, conversations, and short readings sage has
            picked for the patterns that show up in our sessions. each one
            comes with a brief narrated intro.
          </p>
          <div className="mt-8 h-px w-32 bg-gradient-to-r from-gold-400 to-transparent" />
        </header>

        {/* Filter chips + search */}
        <Toolbar
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          counts={resources}
        />

        {/* Asymmetric grid — first card on lg spans 2 columns to give the
            page a magazine-cover feel. */}
        {filtered.length === 0 ? (
          <p className="mt-16 text-sm text-chamber-500 lowercase">
            nothing here matching that. try a different filter.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:gap-x-8 lg:gap-y-16">
            {filtered.map((r, i) => (
              <ResourceCard
                key={r.id}
                resource={r}
                /* Featured-large card only on lg+ — at small widths the
                   2-col grid is already a tight magazine rhythm and
                   bumping one card up just creates a hole. */
                featured={i === 0 && filter === "all"}
                onClick={() => setActive(r)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {active && (
          <DetailSheet resource={active} onClose={() => setActive(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Toolbar({
  filter,
  onFilter,
  query,
  onQuery,
  counts,
}: {
  filter: (typeof FILTERS)[number]["key"];
  onFilter: (k: (typeof FILTERS)[number]["key"]) => void;
  query: string;
  onQuery: (s: string) => void;
  counts: LibraryResource[];
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => {
          const n =
            key === "all"
              ? counts.length
              : counts.filter((r) => r.type === key).length;
          if (key !== "all" && n === 0) return null;
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => onFilter(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs lowercase transition-colors ${
                active
                  ? "bg-chamber-50 text-chamber-900"
                  : "bg-chamber-800/60 text-chamber-300 hover:bg-chamber-800 hover:text-chamber-100"
              }`}
            >
              {label}
              <span
                className={`text-[10px] ${active ? "text-chamber-500" : "text-chamber-500"}`}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-chamber-500" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="search themes, authors..."
          className="w-full rounded-full bg-chamber-800/50 border border-chamber-800 pl-9 pr-3 py-2 text-sm text-chamber-100 placeholder:text-chamber-500 focus:outline-none focus:border-ember-500/40"
          style={{ fontSize: 14 }}
        />
      </div>
    </div>
  );
}

function ResourceCard({
  resource,
  featured,
  onClick,
}: {
  resource: LibraryResource;
  featured: boolean;
  onClick: () => void;
}) {
  const r = resource;
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`group text-left flex flex-col gap-3 ${
        featured ? "lg:col-span-2" : ""
      }`}
    >
      <div className="relative">
        <ResourceCover
          id={r.id}
          title={r.title}
          type={r.type}
          themes={r.themes}
          className="transition-transform duration-500 group-hover:-translate-y-1"
        />
        {/* Hover play badge */}
        <span className="pointer-events-none absolute bottom-2 right-2 h-9 w-9 rounded-full bg-chamber-900/85 backdrop-blur ring-1 ring-chamber-700 flex items-center justify-center text-chamber-50 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 lg:bottom-3 lg:right-3 lg:h-10 lg:w-10">
          <Play className="h-3.5 w-3.5 ml-0.5 lg:h-4 lg:w-4" />
        </span>
      </div>

      <div>
        <p className="text-[9px] uppercase tracking-[0.22em] text-ember-400 mb-1 lg:text-[10px]">
          {r.type}
          {r.author ? (
            <span className="text-chamber-500"> · {r.author}</span>
          ) : null}
        </p>
        <h3
          className={`font-display tracking-tight text-chamber-50 leading-snug ${
            featured
              ? "text-base sm:text-lg lg:text-3xl"
              : "text-base lg:text-xl"
          }`}
        >
          {r.title}
        </h3>
        <p
          className={`mt-1.5 text-xs leading-relaxed text-chamber-300 lg:text-sm ${
            featured
              ? "lg:max-w-xl line-clamp-2 lg:line-clamp-none"
              : "line-clamp-2 lg:line-clamp-3"
          }`}
        >
          {r.blurb}
        </p>
      </div>
    </motion.button>
  );
}

function DetailSheet({
  resource,
  onClose,
}: {
  resource: LibraryResource;
  onClose: () => void;
}) {
  // Lock body scroll.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Adapt LibraryResource → RecommendationPayload["resource"] so we can
  // reuse the existing player without duplicating logic.
  const playerResource: RecommendationPayload["resource"] = {
    id: resource.id,
    type: resource.type,
    title: resource.title,
    author: resource.author,
    url: resource.url,
    blurb: resource.blurb,
    audioUrl: resource.audioUrl,
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-chamber-900/90 backdrop-blur-md"
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={resource.title}
        initial={{ y: "100%", opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
        className="fixed inset-x-0 bottom-0 z-50 h-[96dvh] overflow-y-auto bg-chamber-900 border-t border-chamber-800 rounded-t-3xl px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[640px] lg:h-auto lg:max-h-[88vh] lg:rounded-3xl lg:border lg:px-10 lg:pb-10"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-chamber-500 uppercase tracking-widest">
            from sage's library
          </span>
          <button
            onClick={onClose}
            aria-label="close"
            className="h-8 w-8 rounded-full bg-chamber-800 flex items-center justify-center text-chamber-300 hover:bg-chamber-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cover + meta as a horizontal row — keeps the cover compact so
            the player and copy below get most of the vertical space. */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-20 sm:w-24 lg:w-28 flex-shrink-0">
            <ResourceCover
              id={resource.id}
              title={resource.title}
              type={resource.type}
              themes={resource.themes}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-ember-400 mb-1">
              {resource.type}
              {resource.author ? (
                <span className="text-chamber-500"> · {resource.author}</span>
              ) : null}
            </p>
            <h2 className="font-display text-xl text-chamber-50 leading-snug lg:text-2xl">
              {resource.title}
            </h2>
            {resource.themes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {resource.themes.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-chamber-800/70 border border-chamber-800 px-2 py-0.5 text-[10px] text-chamber-300 lowercase"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <ResourcePlayer resource={playerResource} hideHeading />
      </motion.div>
    </>
  );
}
