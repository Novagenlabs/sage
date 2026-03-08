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
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude 4",
    provider: "Anthropic",
    description: "Excellent reasoning and dialogue",
    contextLength: 200000,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Fast and cost-effective",
    contextLength: 128000,
  },
];

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

export function getModelById(id: string): Model | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id);
}

export function getModelsByProvider(provider: string): Model[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === provider);
}
