// One-off: generate a short MP3 sample for every voice in lib/voices.ts and
// drop them into public/voice-previews/<key>.mp3. The voice picker plays
// these to let the user hear each voice before committing.
//
// Re-run only when:
//   - You add a new voice to lib/voices.ts
//   - You change the SAMPLE_TEXT below (adjusts the preview line)
//   - You bump model_id (e.g. when ElevenLabs ships a new model)
//
// Usage:
//   npx tsx scripts/generate-voice-previews.ts
//
// ElevenLabs charges for TTS, so re-running this on every deploy isn't free.
// The MP3s commit to public/ — they're small (~30-60KB each, ~400KB total).

import "dotenv/config";
import fs from "fs";
import path from "path";
import { AVAILABLE_VOICES } from "../lib/voices";

// One short, neutral line that lets each voice's character come through.
const SAMPLE_TEXT =
  "Hi, I'm Sage. Tell me what's on your mind, and let's untangle it together.";
const MODEL_ID = "eleven_turbo_v2_5";
const OUT_DIR = path.join(process.cwd(), "public", "voice-previews");

async function generateOne(voice: (typeof AVAILABLE_VOICES)[number], apiKey: string) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: SAMPLE_TEXT,
        model_id: MODEL_ID,
        voice_settings: voice.settings,
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs ${res.status} for ${voice.key}: ${text.slice(0, 200)}`
    );
  }
  const buf = await res.arrayBuffer();
  const out = path.join(OUT_DIR, `${voice.key}.mp3`);
  fs.writeFileSync(out, Buffer.from(buf));
  return { key: voice.key, bytes: buf.byteLength, path: out };
}

async function main() {
  const apiKey = process.env.ELEVEN_API_KEY;
  if (!apiKey) {
    console.error(
      "ELEVEN_API_KEY missing. Set it in .env or pass it inline:\n" +
        "  ELEVEN_API_KEY=... npx tsx scripts/generate-voice-previews.ts"
    );
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(
    `Generating ${AVAILABLE_VOICES.length} voice previews → ${OUT_DIR}`
  );
  for (const voice of AVAILABLE_VOICES) {
    process.stdout.write(`  ${voice.key.padEnd(10)} ${voice.id}  `);
    try {
      const r = await generateOne(voice, apiKey);
      console.log(`✓ ${(r.bytes / 1024).toFixed(1)}KB`);
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
