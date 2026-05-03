// Generate a Sage-narrated audio intro for a Resource. Lives here (rather
// than only in the script) so the admin "regenerate audio" button can call
// the same code path as the bulk seed script.
//
// The narration is short — just enough for someone listening on the way to
// work to know whether the resource resonates. Sage opens with the title,
// gives a one-sentence framing, then says why it might matter for this user.
//
// Audio files land at /public/resource-audio/<resourceId>.mp3 and the
// Resource row's audioUrl is updated to the public path.

import fs from "fs";
import path from "path";
import { getDefaultVoice } from "@/lib/voices";

export interface NarratableResource {
  id: string;
  title: string;
  author: string | null;
  blurb: string;
  why: string;
}

const MODEL_ID = "eleven_turbo_v2_5";
const PUBLIC_AUDIO_DIR = path.join(process.cwd(), "public", "resource-audio");

export function buildNarrationScript(r: NarratableResource): string {
  const byline = r.author ? `${r.title}, by ${r.author}.` : `${r.title}.`;
  // Two short paragraphs — enough for ~30-50 seconds of audio. We let Sage
  // speak in first person (matches how she sounds in conversations).
  return `${byline}\n\n${r.blurb}\n\n${r.why}`;
}

/**
 * Mint a fresh narration MP3 for one resource. Returns the public path
 * (e.g. "/resource-audio/<id>.mp3") that should be stored in
 * Resource.audioUrl.
 *
 * Uses Sage's default voice (lib/voices.DEFAULT_VOICE_KEY) with a softer
 * stability so the narration doesn't sound flat — recommendation copy
 * benefits from a bit of warmth.
 */
export async function generateResourceNarration(
  resource: NarratableResource,
  opts?: { apiKey?: string; voiceId?: string }
): Promise<{ publicPath: string; bytes: number }> {
  const apiKey = opts?.apiKey ?? process.env.ELEVEN_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVEN_API_KEY is not set");
  }

  const voice = getDefaultVoice();
  const voiceId = opts?.voiceId ?? voice.id;

  const text = buildNarrationScript(resource);

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
        model_id: MODEL_ID,
        voice_settings: {
          ...voice.settings,
          // A touch more expression than the picker-preview default so the
          // narration sounds like Sage telling you about something she
          // values, not a flat read.
          stability: Math.max(0.55, voice.settings.stability - 0.15),
          style: Math.max(voice.settings.style, 0.15),
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
