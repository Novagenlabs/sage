"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Message, DialogueState, Insight, Assumption } from "./types";
import type { DialoguePhase } from "./prompts";
import { DEFAULT_MODEL } from "./models";

const STORAGE_KEY = "socratic-ai-session";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Phase marker parsing utilities
interface PhaseData {
  phase: DialoguePhase;
  next: DialoguePhase | null;
  ready: boolean;
}

function extractPhaseData(content: string): PhaseData | null {
  const match = content.match(/<!--PHASE:(.*?)-->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  return null;
}

function stripPhaseMarker(content: string): string {
  // Remove complete phase markers
  let cleaned = content.replace(/<!--PHASE:.*?-->/g, "");
  // Remove incomplete phase markers (during streaming) - matches from <!-- to end if it looks like start of marker
  cleaned = cleaned.replace(/<!--P(HASE)?:?[^>]*$/s, "");
  // Remove any trailing partial HTML comment start
  cleaned = cleaned.replace(/<!-?-?$/s, "");
  return cleaned.trim();
}

interface ExtendedDialogueState extends DialogueState {
  sessionStartTime: number | null;
}

const INITIAL_STATE: ExtendedDialogueState = {
  messages: [],
  phase: "opening",
  insights: [],
  assumptions: [],
  themes: [],
  problemStatement: "",
  modelId: DEFAULT_MODEL,
  isLoading: false,
  sessionStartTime: null,
};

function loadFromStorage(): ExtendedDialogueState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Restore Date objects
    parsed.messages = parsed.messages.map((m: Message) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    parsed.insights = parsed.insights.map((i: Insight) => ({
      ...i,
      timestamp: new Date(i.timestamp),
    }));
    // Ensure isLoading is false when restoring
    parsed.isLoading = false;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(state: ExtendedDialogueState): void {
  if (typeof window === "undefined") return;
  try {
    // Don't save isLoading state
    const toSave = { ...state, isLoading: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage errors
  }
}

export function useSocraticChat() {
  const [state, setState] = useState<ExtendedDialogueState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    if (isHydrated && !state.isLoading) {
      saveToStorage(state);
    }
  }, [state, isHydrated]);

  const setModel = useCallback((modelId: string) => {
    setState((prev) => ({ ...prev, modelId }));
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(INITIAL_STATE);
    // Clear storage
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const addInsight = useCallback((content: string) => {
    const insight: Insight = {
      id: generateId(),
      content,
      turnNumber: state.messages.length,
      timestamp: new Date(),
    };
    setState((prev) => ({
      ...prev,
      insights: [...prev.insights, insight],
    }));
  }, [state.messages.length]);

  const sendMessage = useCallback(
    async (content: string) => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
        phase: state.phase,
      };

      // Set problem statement and session start time if this is the first message
      const isFirstMessage = state.messages.length === 0;
      const sessionStartTime = isFirstMessage ? Date.now() : state.sessionStartTime;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        problemStatement: isFirstMessage ? content : prev.problemStatement,
        sessionStartTime: sessionStartTime,
        isLoading: true,
      }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...state.messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            modelId: state.modelId,
            phase: state.phase,
            sessionStartTime: sessionStartTime,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get response");
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const assistantMessageId = generateId();
        let fullContent = "";

        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: assistantMessageId,
              role: "assistant" as const,
              content: "",
              timestamp: new Date(),
              phase: state.phase,
            },
          ],
        }));

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const deltaContent = parsed.choices?.[0]?.delta?.content;
                if (deltaContent) {
                  fullContent += deltaContent;
                  // Show content without phase marker during streaming
                  const displayContent = stripPhaseMarker(fullContent);
                  setState((prev) => ({
                    ...prev,
                    messages: prev.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: displayContent }
                        : msg
                    ),
                  }));
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        // After streaming completes, check for AI-driven phase transition
        const phaseData = extractPhaseData(fullContent);
        if (phaseData?.ready && phaseData.next) {
          setState((prev) => ({ ...prev, phase: phaseData.next as DialoguePhase }));
        }

        // Ensure final content is clean (without phase marker)
        const cleanContent = stripPhaseMarker(fullContent);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          messages: prev.messages.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: cleanContent }
              : msg
          ),
        }));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Chat error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          messages: [
            ...prev.messages,
            {
              id: generateId(),
              role: "assistant",
              content: `I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
              timestamp: new Date(),
            },
          ],
        }));
      }
    },
    [state.messages, state.modelId, state.phase, state.sessionStartTime]
  );

  const setPhase = useCallback((phase: DialoguePhase) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  return {
    ...state,
    isHydrated,
    sendMessage,
    setModel,
    setPhase,
    reset,
    addInsight,
  };
}
