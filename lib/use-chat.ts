"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Message, DialogueState, Insight } from "./types";
import type { DialoguePhase, ConversationContext } from "./prompts";
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
  // Remove incomplete phase markers (during streaming)
  cleaned = cleaned.replace(/<!--P(HASE)?:?[^>]*$/, "");
  // Remove any trailing partial HTML comment start
  cleaned = cleaned.replace(/<!-?-?$/, "");
  return cleaned.trim();
}

interface ExtendedDialogueState extends DialogueState {
  sessionStartTime: number | null;
  conversationId: string | null;
  context: ConversationContext | null;
  profileSummary: string | null;
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
  conversationId: null,
  context: null,
  profileSummary: null,
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
  const [ghostMode, setGhostMode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from localStorage and fetch context on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setState(stored);
    }

    // Fetch context from previous sessions
    fetchContext();

    setIsHydrated(true);
  }, []);

  // Fetch context from API (past summaries + profile summary + user name)
  const fetchContext = async () => {
    try {
      const response = await fetch("/api/conversations/context");
      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          context: {
            recentSummaries: data.recentSummaries,
            profileSummary: data.profileSummary,
            userName: data.userName,
          },
          profileSummary: data.profileSummary || null,
          // If there's an active conversation, restore it
          conversationId: data.activeConversation?.id || prev.conversationId,
        }));
      }
      // 401 is expected when not logged in - silently ignore
    } catch (error) {
      // Only log actual network errors, not auth issues
      console.error("Failed to fetch context:", error);
    }
  };

  // Save to localStorage on state change
  useEffect(() => {
    if (isHydrated && !state.isLoading) {
      saveToStorage(state);
    }
  }, [state, isHydrated]);

  const setModel = useCallback((modelId: string) => {
    setState((prev) => ({ ...prev, modelId }));
  }, []);

  // Create a new conversation in the database
  const createConversation = async (problemStatement: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemStatement }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.id;
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
    return null;
  };

  // Save a message to the database
  const saveMessage = async (
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    phase: DialoguePhase
  ) => {
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content, phase }),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  // End conversation via Inngest (durable background processing)
  // Handles: summarize, extract insights, update profile, mark inactive
  const endConversation = async (conversationId: string) => {
    try {
      console.log("[Chat] Ending conversation via Inngest:", conversationId);

      // Queue durable background processing
      // Processing continues even if user refreshes/leaves the page
      const response = await fetch("/api/conversation/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          type: "text",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Chat] Failed to queue conversation end:", errorText);
      } else {
        console.log("[Chat] Conversation queued for background processing");
      }
    } catch (error) {
      console.error("Failed to end conversation:", error);
    }
  };

  const reset = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // If there's an active conversation with messages, summarize it (skip if ghost mode)
    if (state.conversationId && state.messages.length >= 2 && !ghostMode) {
      setIsResetting(true);
      try {
        await endConversation(state.conversationId);
      } finally {
        setIsResetting(false);
      }
    }

    // Refresh context to include the just-ended conversation
    await fetchContext();

    setState((prev) => ({
      ...INITIAL_STATE,
      context: prev.context, // Keep context
      profileSummary: prev.profileSummary, // Keep profile summary
    }));

    // Clear storage
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state.conversationId, state.messages.length, ghostMode]);

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

      // Create conversation in DB if first message (skip if ghost mode)
      let conversationId = state.conversationId;
      if (isFirstMessage && !ghostMode) {
        conversationId = await createConversation(content);
      }

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        problemStatement: isFirstMessage ? content : prev.problemStatement,
        sessionStartTime: sessionStartTime,
        conversationId: conversationId,
        isLoading: true,
      }));

      // Save user message to DB (skip if ghost mode)
      if (conversationId && !ghostMode) {
        saveMessage(conversationId, "user", content, state.phase);
      }

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
            context: isFirstMessage ? state.context : undefined, // Only send context on first message
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
        let newPhase = state.phase;
        if (phaseData?.ready && phaseData.next) {
          newPhase = phaseData.next as DialoguePhase;
        }

        // Ensure final content is clean (without phase marker)
        const cleanContent = stripPhaseMarker(fullContent);

        // Save assistant message to DB (skip if ghost mode)
        if (conversationId && !ghostMode) {
          saveMessage(conversationId, "assistant", cleanContent, newPhase);
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          phase: newPhase,
          messages: prev.messages.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: cleanContent, phase: newPhase }
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
    [state.messages, state.modelId, state.phase, state.sessionStartTime, state.conversationId, state.context, ghostMode]
  );

  const setPhase = useCallback((phase: DialoguePhase) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  // Toggle ghost mode
  const toggleGhostMode = useCallback(() => {
    setGhostMode((prev) => !prev);
  }, []);

  return {
    ...state,
    isHydrated,
    isResetting,
    sendMessage,
    setModel,
    setPhase,
    reset,
    addInsight,
    ghostMode,
    toggleGhostMode,
  };
}
