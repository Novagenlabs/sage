// Type definitions for Socratic AI

import type { DialoguePhase } from "./prompts";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  phase?: DialoguePhase;
}

export interface Insight {
  id: string;
  content: string;
  turnNumber: number;
  timestamp: Date;
}

export interface Assumption {
  id: string;
  content: string;
  examined: boolean;
  challenged: boolean;
  turnNumber: number;
}

export interface DialogueState {
  messages: Message[];
  phase: DialoguePhase;
  insights: Insight[];
  assumptions: Assumption[];
  themes: string[];
  problemStatement: string;
  modelId: string;
  isLoading: boolean;
}

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  modelId: string;
  phase: DialoguePhase;
}

export interface AnalysisResult {
  assumptions: string[];
  insights: string[];
  themes: string[];
  suggestTransition: boolean;
  suggestedPhase?: DialoguePhase;
}
