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

export const AVAILABLE_VOICES: Voice[] = [
  {
    key: "sage",
    id: "7NsaqHdLuKNFvEfjpUno",
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
    id: "21m00Tcm4TlvDq8ikWAM",
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
    id: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda",
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
    key: "thomas",
    id: "GBv7mTt0atIp3Br8iCZE",
    name: "Thomas",
    gender: "male",
    description: "Calm and meditative",
    settings: {
      stability: 0.8,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
    },
  },
  {
    key: "emily",
    id: "LcfcDJNUP1GQjkzn1xUU",
    name: "Emily",
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
    key: "james",
    id: "ZQe5CZNOzWyzPSCn5a3c",
    name: "James",
    gender: "male",
    description: "Thoughtful and steady",
    settings: {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
    },
  },
];

export const DEFAULT_VOICE_KEY = "sage";

export function getVoiceByKey(key: string): Voice | undefined {
  return AVAILABLE_VOICES.find((v) => v.key === key);
}

export function getDefaultVoice(): Voice {
  return AVAILABLE_VOICES.find((v) => v.key === DEFAULT_VOICE_KEY)!;
}
