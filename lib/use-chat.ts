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
  // Remove complete phase + recommend markers
  let cleaned = content.replace(/<!--PHASE:.*?-->/g, "");
  cleaned = cleaned.replace(/<!--RECOMMEND:.*?-->/g, "");
  // Remove incomplete markers (during streaming)
  cleaned = cleaned.replace(/<!--P(HASE)?:?[^>]*$/, "");
  cleaned = cleaned.replace(/<!--R(ECOMMEND)?:?[^>]*$/, "");
  // Remove any trailing partial HTML comment start
  cleaned = cleaned.replace(/<!-?-?$/, "");
  return cleaned.trim();
}

/**
 * Extract Sage's mid-session recommendation pattern hint, if she emitted
 * one. Returns the short pattern name (e.g. "decision paralysis") or null.
 * Sage's prompt instructs her to emit at most once per session.
 */
function extractRecommendationHint(content: string): string | null {
  const match = content.match(/<!--RECOMMEND:(.*?)-->/);
  if (!match) return null;
  const hint = match[1].trim();
  return hint.length > 0 && hint.length < 120 ? hint : null;
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
  // Mid-session recommendation: when Sage emits a RECOMMEND marker we
  // capture the pattern hint here. The chat page reads it, fires the
  // recommendation stream once, then calls clearRecommendationHint.
  const [recommendationHint, setRecommendationHint] = useState<string | null>(
    null
  );
  // Ghost mode is shared across screens via localStorage so the v2 ghost
  // toggle (/ghost) reflects + controls the same flag the chat uses.
  const [ghostMode, setGhostMode] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sage-ghost-mode");
      if (stored === "1") setGhostMode(true);
    } catch {
      /* ignore */
    }
    // Sync if another tab toggles it.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sage-ghost-mode") setGhostMode(e.newValue === "1");
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
  }, []);
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

  // End conversation via Inngest. The full in-memory transcript travels in
  // the request body — it is summarised once and never persisted as messages.
  const endConversation = async (
    conversationId: string,
    messages: Message[]
  ) => {
    try {
      console.log("[Chat] Ending conversation via Inngest:", conversationId);

      const response = await fetch("/api/conversation/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          type: "text",
          transcript: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
        await endConversation(state.conversationId, state.messages);
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
    setRecommendationHint(null);

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

      // Per the summary-only persistence change, individual messages are
      // never written to the DB. The transcript is sent in one shot via
      // /api/conversation/end when the session ends.

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
            conversationId: conversationId || undefined,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            throw new Error("Please sign in to continue the conversation.");
          }
          if (response.status === 402) {
            throw new Error("You're out of credits. Please purchase more to continue.");
          }
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

        // Mid-session recommendation marker — Sage emits at most once per
        // session when a pattern crystallises. The chat page reads this and
        // fires the recommendation stream against the catalog.
        const hint = extractRecommendationHint(fullContent);
        if (hint) {
          setRecommendationHint(hint);
        }

        // Ensure final content is clean (without phase or recommend markers)
        const cleanContent = stripPhaseMarker(fullContent);

        // No per-message DB write — transcript is sent only at session end.

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
    setGhostMode((prev) => {
      const next = !prev;
      try {
        if (next) localStorage.setItem("sage-ghost-mode", "1");
        else localStorage.removeItem("sage-ghost-mode");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clearRecommendationHint = useCallback(() => {
    setRecommendationHint(null);
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
    recommendationHint,
    clearRecommendationHint,
  };
}
