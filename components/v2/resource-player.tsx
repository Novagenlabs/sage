"use client";

// Renders a Resource inline. Used as the body of the player sheet
// (recommendation card or library detail) when the user taps "play" or
// opens a card.
//
// Render order, top to bottom:
//   1. Embeddable media if URL maps to one — YouTube iframe, Spotify
//      iframe, direct audio. Plays in a panel at the top.
//   2. Sage's narration audio (audioUrl) — short ~30-50s intro, played
//      via a custom scrubber.
//   3. Sage's transformative reading (bodyText) — long-form commentary
//      typeset for actual reading. Cited via bodySource.
//   4. The blurb (one-liner) and an "open the original" link.
//
// Multiple of these can be present at once (e.g. a TED talk has the
// embed AND a narration AND a written reading). The user can pick.

import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Pause,
  Play,
  Volume2,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import { detectEmbed } from "@/lib/recommendations/embed";
import type { RecommendationPayload } from "@/lib/recommendations/types";

interface Props {
  resource: RecommendationPayload["resource"];
  /** Called when the user clicks the external-open link. Lets the parent
   *  fire the click-tracking endpoint before the new tab opens. */
  onClickOpen?: () => void;
  /** Hide the internal title/author heading. Use when the surrounding sheet
   *  already shows it (e.g. the library detail sheet). */
  hideHeading?: boolean;
}

export function ResourcePlayer({ resource, onClickOpen, hideHeading }: Props) {
  const embed = detectEmbed(resource.url);

  const trackOpen = () => {
    onClickOpen?.();
  };

  const heading = hideHeading ? null : (
    <div className="mb-4">
      <p className="text-[10px] uppercase tracking-widest text-chamber-500 mb-1">
        {resource.type}
        {resource.author ? ` · ${resource.author}` : ""}
      </p>
      <h2 className="font-display text-xl text-chamber-50 leading-snug">
        {resource.title}
      </h2>
    </div>
  );

  // Compose the player from layered surfaces. Each is optional and only
  // renders when its corresponding data is present.
  const hasEmbed =
    (embed.kind === "youtube" || embed.kind === "spotify" || embed.kind === "audio") &&
    !!embed.embedSrc;

  return (
    <div className="space-y-4">
      {heading}

      {/* 1. Embedded media (YouTube / Spotify / direct audio) */}
      {hasEmbed && embed.kind === "youtube" && (
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-chamber-900 border border-chamber-800">
          <iframe
            src={embed.embedSrc}
            title={resource.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}
      {hasEmbed && embed.kind === "spotify" && (
        <iframe
          src={embed.embedSrc}
          title={resource.title}
          className="w-full rounded-2xl"
          style={{ minHeight: 232 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
      {hasEmbed && embed.kind === "audio" && (
        <audio
          controls
          src={embed.embedSrc}
          className="w-full"
          preload="metadata"
        />
      )}

      {/* 2. Sage's short narrated intro (~30-50s) */}
      {resource.audioUrl && <SageNarration src={resource.audioUrl} />}

      {/* 3. Sage's long-form reading — typeset for actual reading. */}
      {resource.bodyText && (
        <SageReading
          body={resource.bodyText}
          source={resource.bodySource ?? null}
        />
      )}

      {/* 4. The blurb is only a useful summary if we have NO body text;
          when bodyText is present it covers everything the blurb would. */}
      {!resource.bodyText && (
        <p className="text-sm text-chamber-300 leading-relaxed">
          {resource.blurb}
        </p>
      )}

      <ExternalOpen href={resource.url} onClick={trackOpen} />
    </div>
  );
}

/**
 * Sage's transformative reading. Typeset like a literary journal entry
 * rather than a textarea of stuff: Cormorant body, drop cap on the first
 * paragraph, generous line height, citation footer. Collapsible so the
 * sheet stays scannable when the user just wants to play media.
 */
function SageReading({
  body,
  source,
}: {
  body: string;
  source: string | null;
}) {
  // Default open on desktop, collapsed on small screens to keep the sheet
  // scannable. The user can toggle either way.
  const [open, setOpen] = useState<boolean | null>(null);

  // First-render init: open if the device is roughly desktop-width.
  useEffect(() => {
    if (open !== null) return;
    setOpen(typeof window !== "undefined" && window.innerWidth >= 1024);
  }, [open]);

  // Paragraphs separated by blank lines.
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="rounded-2xl bg-chamber-900/60 border border-chamber-800 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-chamber-800">
        <p className="text-[10px] uppercase tracking-[0.22em] text-ember-400 inline-flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" />
          sage's reading
        </p>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "collapse" : "expand"}
          className="text-chamber-500 hover:text-chamber-200 transition-colors"
        >
          {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </header>
      {open && (
        <div className="px-4 sm:px-5 lg:px-7 py-5 sm:py-6 lg:py-8">
          <div className="space-y-4 lg:space-y-5 text-[15px] leading-[1.7] lg:text-[17px] lg:leading-[1.8] text-chamber-100 font-display max-w-prose mx-auto [&>p:first-child::first-letter]:font-display [&>p:first-child::first-letter]:text-5xl lg:[&>p:first-child::first-letter]:text-6xl [&>p:first-child::first-letter]:leading-none [&>p:first-child::first-letter]:float-left [&>p:first-child::first-letter]:mr-2 [&>p:first-child::first-letter]:mt-1 [&>p:first-child::first-letter]:text-ember-400">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {source && (
            <p className="mt-6 lg:mt-8 pt-4 border-t border-chamber-800 text-[11px] text-chamber-500 italic max-w-prose mx-auto">
              {source}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function SageNarration({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => setPlaying(false);
    const onTime = () => {
      if (a.duration) setProgress(a.currentTime / a.duration);
    };
    const onMeta = () => setDuration(a.duration || 0);
    a.addEventListener("ended", onEnd);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.pause();
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  };

  const seek = (frac: number) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    a.currentTime = a.duration * frac;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl bg-chamber-800/60 border border-chamber-800 p-4">
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={toggle}
          aria-label={playing ? "pause" : "play"}
          className="h-11 w-11 rounded-full bg-ember-500 text-white flex items-center justify-center hover:bg-ember-400 transition-colors flex-shrink-0"
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-ember-400 mb-1 inline-flex items-center gap-1.5">
            <Volume2 className="h-3 w-3" />
            sage on this
          </p>
          <p className="text-xs text-chamber-400 lowercase">
            listen instead of read
          </p>
        </div>
      </div>
      {/* Progress bar — clickable for scrubbing. */}
      <button
        type="button"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const frac = (e.clientX - rect.left) / rect.width;
          seek(Math.max(0, Math.min(1, frac)));
        }}
        className="block w-full group"
        aria-label="seek"
      >
        <div className="relative h-1.5 rounded-full bg-chamber-900/70 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-ember-500 transition-[width]"
            style={{ width: `${(progress * 100).toFixed(2)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-chamber-500 lowercase">
          <span>{fmt(progress * duration)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </button>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
}

function ExternalOpen({ href, onClick }: { href: string; onClick?: () => void }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-ember-300 hover:text-ember-200 lowercase"
    >
      open the original
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
