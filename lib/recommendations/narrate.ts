// Generate a Sage-narrated audio reading for a Resource. Lives here (rather
// than only in the script) so the admin "regenerate audio" button can call
// the same code path as the bulk seed script.
//
// The audio is the spoken version of `Resource.bodyText` — Sage's
// transformative reading of the work, voiced. Length is whatever the text
// requires (typically 2-3 minutes for our ~250-350 word commentaries).
// When bodyText is missing we fall back to a short intro built from
// (blurb + why), which produces a ~30s teaser.
//
// Audio files land at /public/resource-audio/<resourceId>.mp3 and the
// Resource row's audioUrl is updated to the public path.

import fs from "fs";
import path from "path";
import { AVAILABLE_VOICES } from "@/lib/voices";

export interface NarratableResource {
  id: string;
  title: string;
  author: string | null;
  blurb: string;
  why: string;
  /** Sage's full reading. When present, we narrate this verbatim. */
  bodyText?: string | null;
  /** Citation appended after the body, voiced quietly as the outro. */
  bodySource?: string | null;
}

// eleven_v3 is ElevenLabs' most expressive model — alpha but publicly
// available via the API. Better cadence + emotional range than
// multilingual_v2, supports audio tags ([thoughtfully], [whispers],
// [slowly], [chuckles] etc.) embedded inline in the script. 5,000-char
// limit per request (our bodyTexts run 1,500-2,200, well under).
//
// To revert to the older stable model, set NARRATION_MODEL_ID in env.
const DEFAULT_MODEL_ID = process.env.NARRATION_MODEL_ID ?? "eleven_v3";

// Per-request character cap for v3. We split on paragraph boundaries if
// a future bodyText ever blows past this (none currently do).
const V3_MAX_CHARS = 5000;

// Default narrator: Emily — soft, nurturing, fits the literary-journal tone
// of Sage's commentary better than the IFy chat voice. Override per-call
// via opts.voiceId or globally via NARRATION_VOICE_KEY in env.
const DEFAULT_NARRATION_VOICE_KEY =
  process.env.NARRATION_VOICE_KEY ?? "emily";

const PUBLIC_AUDIO_DIR = path.join(process.cwd(), "public", "resource-audio");

export function buildNarrationScript(r: NarratableResource): string {
  const byline = r.author ? `${r.title}, by ${r.author}.` : `${r.title}.`;

  if (r.bodyText && r.bodyText.trim()) {
    // Full reading. Title intro, then the body, then a quiet attribution
    // outro so the listener always hears where the source is from.
    const tail = r.bodySource
      ? `\n\n${r.bodySource}`
      : "";
    return `${byline}\n\n${r.bodyText.trim()}${tail}`;
  }

  // Fallback: short intro from blurb + why. Used when bodyText hasn't been
  // written yet so the audio surface still works.
  return `${byline}\n\n${r.blurb}\n\n${r.why}`;
}

/**
 * Mint a fresh narration MP3 for one resource. Returns the public path
 * (e.g. "/resource-audio/<id>.mp3") that should be stored in
 * Resource.audioUrl.
 *
 * Defaults to Emily voice + multilingual_v2 model. Both can be overridden
 * via opts (used by the admin "regenerate audio" button if we ever wire it
 * to a voice picker).
 */
export async function generateResourceNarration(
  resource: NarratableResource,
  opts?: {
    apiKey?: string;
    voiceId?: string;
    voiceKey?: string;
    modelId?: string;
  }
): Promise<{ publicPath: string; bytes: number }> {
  const apiKey = opts?.apiKey ?? process.env.ELEVEN_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVEN_API_KEY is not set");
  }

  // Resolve voice: explicit voiceId wins, then voiceKey, then env default.
  const voiceKey = opts?.voiceKey ?? DEFAULT_NARRATION_VOICE_KEY;
  const matchedVoice =
    AVAILABLE_VOICES.find((v) => v.key === voiceKey) ?? AVAILABLE_VOICES[0];
  const voiceId = opts?.voiceId ?? matchedVoice.id;

  const modelId = opts?.modelId ?? DEFAULT_MODEL_ID;
  const text = buildNarrationScript(resource);

  // v3 caps requests at 5,000 characters. Our curated commentaries fit
  // comfortably; this guard catches future entries that would silently
  // truncate or 400 server-side.
  if (modelId === "eleven_v3" && text.length > V3_MAX_CHARS) {
    throw new Error(
      `Script for ${resource.id} is ${text.length} chars; v3 caps at ${V3_MAX_CHARS}. Trim bodyText or split into chunks.`
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        // Voice settings tuned per ElevenLabs v3 prompting guide:
        //   stability ~0.5 = "Natural" — balanced range without drift.
        //   style ~0.4    = interpretive warmth across long paragraphs.
        //   similarity_boost retained from the picked voice's profile.
        // For multilingual_v2 these values still produce excellent reads.
        voice_settings: {
          ...matchedVoice.settings,
          stability: 0.5,
          style: 0.4,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs ${res.status} ${res.statusText}: ${body.slice(0, 240)}`
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());

  if (!fs.existsSync(PUBLIC_AUDIO_DIR)) {
    fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
  }

  const filename = `${resource.id}.mp3`;
  const out = path.join(PUBLIC_AUDIO_DIR, filename);
  fs.writeFileSync(out, buf);

  return {
    publicPath: `/resource-audio/${filename}`,
    bytes: buf.byteLength,
  };
}
