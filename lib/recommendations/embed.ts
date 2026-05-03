// Embed-kind detector. Given a Resource URL, decide how to render it
// inline. Pure function — no fetches, no DOM access — so it works on both
// server and client.
//
// Strategy:
//   - YouTube (any flavor) → "youtube" + the watch id (used in iframe src)
//   - Spotify (track / episode / show) → "spotify" + the canonical embed
//     URL on open.spotify.com/embed/...
//   - Direct audio file (mp3, m4a, ogg, wav, aac) → "audio" + the URL
//   - Wikipedia / known iframe-blocked sources → "external"  (we render
//     a callout + open-in-new-tab, plus the Sage-narrated audio if any)
//   - Anything else → "external"
//
// Resource.audioUrl (a Sage-narrated MP3) is orthogonal to this — even
// when the embed kind is "external" we can still play the narration.

export type EmbedKind = "youtube" | "spotify" | "audio" | "external";

export interface EmbedInfo {
  kind: EmbedKind;
  /** Final URL to put in <iframe src> or <audio src>. Only set for
   *  kinds the player can actually embed. */
  embedSrc?: string;
  /** Original URL (always preserved — used for the "open externally" link). */
  href: string;
}

const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);
const SPOTIFY_HOSTS = new Set(["open.spotify.com", "spotify.com"]);
const AUDIO_EXTS = [".mp3", ".m4a", ".ogg", ".wav", ".aac"];

function youtubeId(u: URL): string | null {
  if (u.hostname === "youtu.be") {
    return u.pathname.replace(/^\//, "").split("/")[0] || null;
  }
  // /watch?v=ID
  const v = u.searchParams.get("v");
  if (v) return v;
  // /embed/ID  or  /shorts/ID  or  /v/ID
  const m = u.pathname.match(/^\/(?:embed|shorts|v)\/([^/?#]+)/);
  if (m) return m[1];
  return null;
}

function spotifyEmbed(u: URL): string | null {
  // Accept open.spotify.com/<type>/<id>?... and convert to /embed/<type>/<id>.
  const m = u.pathname.match(/^\/(track|episode|show|album|playlist)\/([^/?#]+)/);
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
}

export function detectEmbed(href: string): EmbedInfo {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { kind: "external", href };
  }

  if (YT_HOSTS.has(url.hostname)) {
    const id = youtubeId(url);
    if (id) {
      return {
        kind: "youtube",
        embedSrc: `https://www.youtube.com/embed/${id}`,
        href,
      };
    }
  }

  if (SPOTIFY_HOSTS.has(url.hostname)) {
    const e = spotifyEmbed(url);
    if (e) return { kind: "spotify", embedSrc: e, href };
  }

  const path = url.pathname.toLowerCase();
  if (AUDIO_EXTS.some((ext) => path.endsWith(ext))) {
    return { kind: "audio", embedSrc: href, href };
  }

  return { kind: "external", href };
}
