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
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const maxHeight = window.innerWidth < 640 ? 120 : 200;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  }, [value]);

  // Auto-focus when AI finishes responding
  const prevDisabledRef = useRef(disabled);
  useEffect(() => {
    if (prevDisabledRef.current === true && disabled === false) {
      textareaRef.current?.focus();
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

  // Focus on initial mount if not disabled
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      if (!session) {
        router.push("/auth/signin");
        return;
      }
      onSend(value.trim());
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const isTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      if (!isTouchDevice) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={`
          flex items-end gap-2 sm:gap-3 p-2 sm:p-3
          glass-strong rounded-2xl shadow-lg shadow-black/20
          transition-all duration-300
          ${isFocused ? "border-gold-400/25 shadow-ember-500/5" : ""}
        `}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || "Share what's on your mind..."}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base text-chamber-100 placeholder-chamber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
          style={{ fontSize: '16px' }}
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className={`
            flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl
            transition-all duration-300 flex items-center justify-center touch-manipulation
            ${value.trim() && !disabled
              ? "bg-ember-500 hover:bg-ember-400 active:bg-ember-600 shadow-lg shadow-ember-500/20"
              : "bg-chamber-700/50 opacity-50 cursor-not-allowed"
            }
          `}
          aria-label="Send message"
        >
          <Send className="w-4 h-4 sm:w-4 sm:h-4 text-white" />
        </button>
      </div>
    </form>
  );
}
