"use client";

// Procedural cover art for a Resource. Renders an SVG with two layered
// radial gradients tinted by the resource's first theme, a faint grain
// texture, and the title's first letter as a low-opacity serif initial in
// the bottom-right. Deterministic — given (id, themes, title) the cover
// always looks the same, so users build memory of "the gold one" or
// "the plum one with the C in the corner."
//
// We don't use any AI image generation here — these are pure SVG.

import type { ResourceType } from "@/lib/recommendations/types";

// Six palettes mapped to themes that recur in the catalog. The pairs are
// tuned to feel painterly and warm, never neon. The final colour is the
// chamber base so each cover fades into the dark page.
const PALETTES: Array<{ a: string; b: string; c: string }> = [
  { a: "#e07c38", b: "#71371f", c: "#08080c" }, // ember
  { a: "#c4956a", b: "#6d4633", c: "#08080c" }, // gold
  { a: "#6b9a8d", b: "#2c433d", c: "#08080c" }, // sage
  { a: "#b48af2", b: "#7e51c8", c: "#08080c" }, // plum
  { a: "#f5b8d6", b: "#c768a0", c: "#08080c" }, // bloom
  { a: "#cfe83a", b: "#697b18", c: "#08080c" }, // zest
];

// Map each top-level theme bucket to a palette index. Anything not in this
// map falls back to a hash-derived choice so new themes still get colour.
const THEME_HUE: Record<string, number> = {
  // ember (warm, urgent, presence)
  "decision-paralysis": 0,
  "decision-making": 0,
  "perfectionism": 0,
  "starting-anyway": 0,
  // gold (mortality, time, virtue)
  "mortality": 1,
  "time": 1,
  "daily-practice": 1,
  "duty-as-anchor": 1,
  "control-vs-acceptance": 1,
  "what-matters": 1,
  // sage (groundlessness, integration, embodiment)
  "groundlessness": 2,
  "embracing-uncertainty": 2,
  "wu-wei": 2,
  "non-action": 2,
  "letting-go": 2,
  "integration": 2,
  // plum (mystery, awakening, isolation-of-insight)
  "isolation-of-insight": 3,
  "awakening": 3,
  "alienation-from-others": 3,
  "shadow-self": 3,
  "ego": 3,
  "identity": 3,
  // bloom (relational, vulnerability, intimacy)
  "vulnerability": 4,
  "shame": 4,
  "long-term-relationships": 4,
  "intimacy-vs-aliveness": 4,
  "couples": 4,
  "friendship": 4,
  "soul": 4,
  "longing": 4,
  // zest (joy, pleasure, awakening to life)
  "pleasure": 5,
  "joy-as-resistance": 5,
  "absurdity": 5,
  "defiance": 5,
  "self-acceptance": 5,
};

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickPaletteIndex(seedId: string, themes: string[]): number {
  for (const t of themes) {
    if (t in THEME_HUE) return THEME_HUE[t];
  }
  return hashCode(seedId) % PALETTES.length;
}

// Each resource type gets a tiny glyph in the top-left so the cover reads
// at a glance even before the title.
const TYPE_GLYPH: Record<ResourceType, string> = {
  book: "❦",
  article: "§",
  lecture: "✶",
  podcast: "◴",
  video: "▶",
  audiobook: "♪",
};

interface Props {
  id: string;
  title: string;
  type: ResourceType;
  themes: string[];
  /** Square width in CSS px. Defaults to fill the container. */
  size?: number | string;
  className?: string;
}

export function ResourceCover({
  id,
  title,
  type,
  themes,
  size = "100%",
  className = "",
}: Props) {
  const palette = PALETTES[pickPaletteIndex(id, themes)];
  const initial = (title.match(/[a-zA-Z]/)?.[0] ?? "•").toUpperCase();
  // Stable variants so each cover differs slightly even within a palette.
  const seed = hashCode(id);
  const angle = (seed % 90) - 45; // -45° to +44° tilt on the inner gradient
  const offsetX = 30 + ((seed >> 3) % 40); // 30-69
  const offsetY = 25 + ((seed >> 6) % 50); // 25-74

  // Gradient ids must be unique per cover so multiple covers on a page
  // don't bleed into each other.
  const gA = `g_a_${id}`;
  const gB = `g_b_${id}`;

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-2xl ring-1 ring-chamber-700/60 shadow-[0_18px_48px_-24px_rgba(0,0,0,0.6)] ${className}`}
      style={{ width: size, height: typeof size === "number" ? size : undefined }}
    >
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <radialGradient id={gA} cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={palette.a} stopOpacity="1" />
            <stop offset="60%" stopColor={palette.b} stopOpacity="0.95" />
            <stop offset="100%" stopColor={palette.c} stopOpacity="1" />
          </radialGradient>
          <radialGradient
            id={gB}
            cx={`${offsetX}%`}
            cy={`${offsetY}%`}
            r="55%"
            gradientTransform={`rotate(${angle} 100 100)`}
          >
            <stop offset="0%" stopColor={palette.a} stopOpacity="0.55" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="200" height="200" fill={`url(#${gA})`} />
        <rect width="200" height="200" fill={`url(#${gB})`} />

        {/* Type glyph in top-left, faint */}
        <text
          x="14"
          y="32"
          fontFamily="serif"
          fontSize="22"
          fill={palette.a}
          fillOpacity="0.5"
        >
          {TYPE_GLYPH[type]}
        </text>

        {/* Big serif initial in bottom-right — the painterly anchor */}
        <text
          x="194"
          y="190"
          textAnchor="end"
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontStyle="italic"
          fontSize="170"
          fill={palette.a}
          fillOpacity="0.18"
          style={{ letterSpacing: "-0.03em" }}
        >
          {initial}
        </text>
      </svg>

      {/* Film grain overlay — borrowed from the chamber styling. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
