/**
 * Credit cost configuration for all services.
 *
 * User-facing billing:
 *   Voice: 1 credit = 1 second of call time (countdown timer)
 *   Chat:  Post-stream deduction based on token estimate
 *
 * Background analytics:
 *   Real USD costs tracked async via provider APIs
 */

// --- Voice billing (user-facing) ---

/** 1 credit buys this many seconds of voice call time */
export const SECONDS_PER_CREDIT = 1;

/** Show "credits expiring" warning at this many seconds remaining */
export const LOW_CREDITS_WARNING_SECS = 60;

/** Auto-disconnect timeout (seconds) after credits hit 0 if user doesn't extend */
export const AUTO_DISCONNECT_TIMEOUT_SECS = 30;

/** Convert a credit balance to max call duration in seconds */
export function creditsToSeconds(credits: number): number {
  return credits * SECONDS_PER_CREDIT;
}

/** Convert used call seconds to credits consumed (rounded up) */
export function secondsToCredits(seconds: number): number {
  return Math.ceil(seconds / SECONDS_PER_CREDIT);
}

// --- Video billing (Anam avatar) ---

/**
 * Avatar streaming is roughly 3x the cost of voice (avatar GPU + lip-sync
 * + voice). Pricing reflects that: 3 credits per second of video.
 */
export const VIDEO_CREDITS_PER_SECOND = 3;

/** Convert credit balance to max video session duration in seconds */
export function creditsToVideoSeconds(credits: number): number {
  return Math.floor(credits / VIDEO_CREDITS_PER_SECOND);
}

/** Convert used video seconds to credits consumed (rounded up) */
export function videoSecondsToCredits(seconds: number): number {
  return Math.ceil(seconds * VIDEO_CREDITS_PER_SECOND);
}

// --- USD conversion (background analytics) ---

/** Base unit: 1 credit = $0.005 USD (200 credits = $1) */
export const USD_PER_CREDIT = 0.005;

/** Convert a USD cost to credits */
export function usdToCredits(usd: number): number {
  return Math.ceil(usd / USD_PER_CREDIT);
}

/** Convert credits to USD */
export function creditsToUsd(credits: number): number {
  return credits * USD_PER_CREDIT;
}

// --- Fallback service rates (USD) when provider APIs are unavailable ---

export const FALLBACK_RATES = {
  elevenlabs: {
    perChar: 0.00008, // ~$0.08 per 1K chars (Flash v2.5 on Pro plan)
  },
  deepgram: {
    perMinute: 0.0077, // Nova-3 monolingual
  },
  livekit: {
    agentPerMinute: 0.01, // $0.01/min agent session
  },
} as const;

/** Estimate ElevenLabs TTS cost from character count */
export function estimateTTSCostUsd(
  characterCount: number,
  costPerChar?: number
): number {
  const rate = costPerChar || FALLBACK_RATES.elevenlabs.perChar;
  return characterCount * rate;
}

/** Estimate Deepgram STT cost from audio duration */
export function estimateSTTCostUsd(durationSeconds: number): number {
  return (durationSeconds / 60) * FALLBACK_RATES.deepgram.perMinute;
}

/** Estimate LiveKit cost from session duration */
export function estimateLiveKitCostUsd(sessionDurationSeconds: number): number {
  return (sessionDurationSeconds / 60) * FALLBACK_RATES.livekit.agentPerMinute;
}
