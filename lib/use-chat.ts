"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Message, DialogueState, Insight, Assumption } from "./types";
import type { DialoguePhase } from "./prompts";
import { DEFAULT_MODEL } from "./models";

const STORAGE_KEY = "socratic-ai-session";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

const INITIAL_STATE: DialogueState = {
  messages: [],
  phase: "opening",
  insights: [],
  assumptions: [],
  themes: [],
  problemStatement: "",
  modelId: DEFAULT_MODEL,
  isLoading: false,
};

function loadFromStorage(): DialogueState | null {
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

function saveToStorage(state: DialogueState): void {
  if (typeof window === "undefined") return;
  try {
    // Don't save isLoading state
    const toSave = { ...state, isLoading: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage errors
  }
}

// Phase transition logic
const PHASE_ORDER: DialoguePhase[] = [
  "opening",
  "exploring",
  "examining",
  "challenging",
  "expanding",
  "synthesizing",
  "concluding",
];

function shouldTransitionPhase(
  currentPhase: DialoguePhase,
  messageCount: number
): DialoguePhase | null {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  // Simple heuristic: transition based on message count
  // In a real app, you'd use AI to analyze when to transition
  const thresholds: Record<DialoguePhase, number> = {
    opening: 2,
    exploring: 4,
    examining: 6,
    challenging: 4,
    expanding: 4,
    synthesizing: 4,
    concluding: 2,
  };

  const messagesInPhase = messageCount;
  if (messagesInPhase >= thresholds[currentPhase] && currentIndex < PHASE_ORDER.length - 1) {
    return PHASE_ORDER[currentIndex + 1];
  }

  return null;
}

export function useSocraticChat() {
  const [state, setState] = useState<DialogueState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const phaseMessageCountRef = useRef(0);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setState(stored);
      // Restore phase message count based on messages in current phase
      const currentPhaseMessages = stored.messages.filter(
        (m) => m.phase === stored.phase
      );
      phaseMessageCountRef.current = currentPhaseMessages.length;
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
    phaseMessageCountRef.current = 0;
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

      // Set problem statement if this is the first message
      const isFirstMessage = state.messages.length === 0;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        problemStatement: isFirstMessage ? content : prev.problemStatement,
        isLoading: true,
      }));

      phaseMessageCountRef.current++;

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
                  setState((prev) => ({
                    ...prev,
                    messages: prev.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + deltaContent }
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

        phaseMessageCountRef.current++;

        // Check for phase transition
        const newPhase = shouldTransitionPhase(
          state.phase,
          phaseMessageCountRef.current
        );
        if (newPhase) {
          phaseMessageCountRef.current = 0;
          setState((prev) => ({ ...prev, phase: newPhase }));
        }

        setState((prev) => ({ ...prev, isLoading: false }));
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
    [state.messages, state.modelId, state.phase]
  );

  const setPhase = useCallback((phase: DialoguePhase) => {
    phaseMessageCountRef.current = 0;
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
