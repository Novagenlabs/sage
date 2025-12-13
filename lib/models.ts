// Available AI models on OpenRouter (December 2025)
// Curated list of top models for Socratic dialogue

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  isReasoning?: boolean;
  isFree?: boolean;
}

export const AVAILABLE_MODELS: Model[] = [
  // Anthropic Claude (Latest 2025)
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    description: "Latest Claude model with excellent reasoning and dialogue",
    contextLength: 200000,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Strong reasoning and nuanced conversation",
    contextLength: 200000,
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    description: "Fast and efficient for quick exchanges",
    contextLength: 200000,
  },

  // OpenAI (Latest 2025)
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "OpenAI's flagship multimodal model",
    contextLength: 128000,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Efficient and cost-effective",
    contextLength: 128000,
  },
  {
    id: "openai/o1",
    name: "o1",
    provider: "OpenAI",
    description: "Advanced reasoning model",
    contextLength: 200000,
    isReasoning: true,
  },
  {
    id: "openai/o1-mini",
    name: "o1 Mini",
    provider: "OpenAI",
    description: "Efficient reasoning model",
    contextLength: 128000,
    isReasoning: true,
  },

  // DeepSeek (Latest 2025)
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    description: "Powerful reasoning model with chain-of-thought",
    contextLength: 64000,
    isReasoning: true,
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    description: "Strong general-purpose chat model",
    contextLength: 64000,
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 (Free)",
    provider: "DeepSeek",
    description: "Free tier reasoning model",
    contextLength: 64000,
    isReasoning: true,
    isFree: true,
  },

  // Google Gemini (Latest 2025)
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Fast experimental Gemini model",
    contextLength: 1000000,
    isFree: true,
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "Google",
    description: "Long context multimodal model",
    contextLength: 2000000,
  },

  // Meta Llama (Latest 2025)
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
    description: "Latest open-source Llama model",
    contextLength: 128000,
  },

  // Mistral (Latest 2025)
  {
    id: "mistralai/mistral-large-2411",
    name: "Mistral Large",
    provider: "Mistral",
    description: "Top-tier reasoning and coding",
    contextLength: 128000,
  },

  // Qwen (Latest 2025)
  {
    id: "qwen/qwq-32b",
    name: "QwQ 32B",
    provider: "Qwen",
    description: "Strong reasoning capabilities",
    contextLength: 32000,
    isReasoning: true,
  },
];

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

export function getModelById(id: string): Model | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id);
}

export function getModelsByProvider(provider: string): Model[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === provider);
}
