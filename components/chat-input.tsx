"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      // Limit max height on mobile for better UX
      const maxHeight = window.innerWidth < 640 ? 120 : 200;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  }, [value]);

  // Auto-focus when AI finishes responding (disabled goes from true to false)
  const prevDisabledRef = useRef(disabled);
  useEffect(() => {
    if (prevDisabledRef.current === true && disabled === false) {
      // AI just finished responding, focus the input
      textareaRef.current?.focus();
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

  // Also focus on initial mount if not disabled
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      // Check if user is authenticated
      if (!session) {
        router.push("/auth/signin");
        return;
      }
      onSend(value.trim());
      setValue("");
      // Reset textarea height after submit
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only submit on Enter without Shift on desktop
    // On mobile, Enter should add a new line
    if (e.key === "Enter" && !e.shiftKey) {
      // Check if we're on a touch device
      const isTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      if (!isTouchDevice) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-2 sm:gap-3 p-2 sm:p-3 bg-stone-900/50 border border-stone-700/30 rounded-2xl shadow-lg shadow-black/20">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Share what's on your mind..."}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base text-white/90 placeholder-stone-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
          style={{ fontSize: '16px' }} // Prevents iOS zoom on focus
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-stone-700 hover:bg-stone-600 active:bg-stone-500 disabled:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center touch-manipulation"
          aria-label="Send message"
        >
          <Send className="w-4 h-4 sm:w-4 sm:h-4 text-white/80" />
        </button>
      </div>
    </form>
  );
}
