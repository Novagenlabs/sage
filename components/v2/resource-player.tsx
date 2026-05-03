"use client";

// Renders a Resource inline — YouTube embed, Spotify embed, or Sage's
// narrated audio with an "open externally" fallback. Used as the body
// of the player sheet that opens when the user taps "play" on a
// recommendation card.
//
// Decision tree:
//   1. Source URL is a YouTube watch link  → YouTube iframe.
//   2. Source URL is a Spotify episode/track → Spotify iframe.
//   3. Source URL is a direct .mp3/.m4a/.ogg → HTML5 audio.
//   4. Otherwise: if Sage has a narration MP3 (audioUrl), play it.
//      Always show "open externally" as a fallback so the user can
//      always reach the original source.

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Pause, Play, Volume2 } from "lucide-react";
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

  // Embedded players: YouTube + Spotify drop their own controls. We just
  // present them inside the sheet chrome.
  if (embed.kind === "youtube" && embed.embedSrc) {
    return (
      <div className="space-y-4">
        {heading}
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
        <p className="text-sm text-chamber-300 leading-relaxed">{resource.blurb}</p>
        <ExternalOpen href={resource.url} onClick={trackOpen} />
      </div>
    );
  }

  if (embed.kind === "spotify" && embed.embedSrc) {
    return (
      <div className="space-y-4">
        {heading}
        <iframe
          src={embed.embedSrc}
          title={resource.title}
          className="w-full rounded-2xl"
          style={{ minHeight: 232 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
        <p className="text-sm text-chamber-300 leading-relaxed">{resource.blurb}</p>
        <ExternalOpen href={resource.url} onClick={trackOpen} />
      </div>
    );
  }

  if (embed.kind === "audio" && embed.embedSrc) {
    return (
      <div className="space-y-4">
        {heading}
        <audio
          controls
          src={embed.embedSrc}
          className="w-full"
          preload="metadata"
        />
        <p className="text-sm text-chamber-300 leading-relaxed">{resource.blurb}</p>
        <ExternalOpen href={resource.url} onClick={trackOpen} />
      </div>
    );
  }

  // External source we can't embed — render Sage's narration if we have one.
  return (
    <div className="space-y-4">
      {heading}
      {resource.audioUrl ? (
        <SageNarration src={resource.audioUrl} />
      ) : (
        <p className="text-sm text-chamber-400 italic leading-relaxed">
          we don&apos;t have an in-app version of this one yet — open it
          externally to read or listen.
        </p>
      )}
      <p className="text-sm text-chamber-300 leading-relaxed">{resource.blurb}</p>
      <ExternalOpen href={resource.url} onClick={trackOpen} />
    </div>
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
            short narrated intro · ~30s
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
