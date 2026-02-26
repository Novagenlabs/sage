// Voice configuration for Sage voice assistant

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export interface Voice {
  id: string;
  key: string;
  name: string;
  gender: "female" | "male";
  description: string;
  settings: VoiceSettings;
}

// All voice IDs verified from ElevenLabs API
export const AVAILABLE_VOICES: Voice[] = [
  {
    key: "sage",
    id: "EXAVITQu4vr4xnSDxMaL", // Sarah
    name: "Sage",
    gender: "female",
    description: "Wise and calm (default)",
    settings: {
      stability: 0.85,
      similarity_boost: 0.8,
      style: 0,
      use_speaker_boost: true,
    },
  },
  {
    key: "rachel",
    id: "21m00Tcm4TlvDq8ikWAM", // Rachel - original working
    name: "Rachel",
    gender: "female",
    description: "Warm and friendly",
    settings: {
      stability: 0.7,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
    },
  },
  {
    key: "matilda",
    id: "XrExE9yKIg1WjnnlVkGX", // Matilda - verified
    name: "Matilda",
    gender: "female",
    description: "Bright and expressive",
    settings: {
      stability: 0.75,
      similarity_boost: 0.8,
      style: 0,
      use_speaker_boost: true,
    },
  },
  {
    key: "george",
    id: "JBFqnCBsd6RMkjVDRZzb", // George - verified
    name: "George",
    gender: "male",
    description: "Calm and thoughtful",
    settings: {
      stability: 0.8,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
    },
  },
  {
    key: "lily",
    id: "pFZP5JQG7iQjIQuC4Bku", // Lily - verified
    name: "Lily",
    gender: "female",
    description: "Gentle and soothing",
    settings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0,
      use_speaker_boost: true,
    },
  },
  {
    key: "brian",
    id: "nPczCjzI2devNBz1zQrb", // Brian - verified
    name: "Brian",
    gender: "male",
    description: "Clear and steady",
    settings: {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
    },
  },
  {
    key: "emily",
    id: "LcfcDJNUP1GQjkzn1xUU", // Emily - verified
    name: "Emily",
    gender: "female",
    description: "Soft and nurturing",
    settings: {
      stability: 0.75,
      similarity_boost: 0.8,
      style: 0,
      use_speaker_boost: true,
    },
  },
  {
    key: "ify",
    id: "b8XX4QShLFkd3yZQlz8T", // IFy - community voice
    name: "IFy",
    gender: "female",
    description: "Relaxed and conversational",
    settings: {
      stability: 0.75,
      similarity_boost: 0.8,
      style: 0,
      use_speaker_boost: true,
    },
  },
];

export const DEFAULT_VOICE_KEY = "emily";

export function getVoiceByKey(key: string): Voice | undefined {
  return AVAILABLE_VOICES.find((v) => v.key === key);
}

export function getDefaultVoice(): Voice {
  return AVAILABLE_VOICES.find((v) => v.key === DEFAULT_VOICE_KEY)!;
}
