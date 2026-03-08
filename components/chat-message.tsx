"use client";

import { clsx } from "clsx";
import type { Message } from "@/lib/types";
import { User } from "lucide-react";
import { LogoOrb } from "./voice-orb-3d";

interface ChatMessageProps {
  message: Message;
  isLatest?: boolean;
}

export function ChatMessage({ message, isLatest }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={clsx(
        "flex gap-3 sm:gap-4 px-3 sm:px-4 py-5 sm:py-6 transition-colors duration-300",
        isUser ? "bg-transparent" : "bg-chamber-800/20"
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="flex-shrink-0 size-7 sm:size-8 rounded-full flex items-center justify-center bg-chamber-700/60 border border-gold-400/10">
          <User className="size-4 sm:size-5 text-chamber-300" />
        </div>
      ) : (
        <>
          <LogoOrb size={28} className="sm:hidden" />
          <LogoOrb size={32} className="hidden sm:block" animated />
        </>
      )}

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={clsx(
            "font-medium text-xs sm:text-sm",
            isUser ? "text-chamber-300" : "text-ember-500"
          )}>
            {isUser ? "You" : "Sage"}
          </span>
          {message.phase && !isUser && (
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-chamber-800/60 text-chamber-400 capitalize border border-gold-400/10">
              {message.phase}
            </span>
          )}
        </div>

        {/* Message content */}
        <div className={clsx(
          "prose-chat text-sm sm:text-base whitespace-pre-wrap leading-relaxed",
          isUser ? "text-chamber-200" : "text-chamber-100"
        )}>
          {message.content}
          {isLatest && !isUser && !message.content && (
            <span className="inline-flex gap-1.5 items-center" role="status" aria-label="Loading">
              <span className="size-1.5 sm:size-2 bg-ember-500/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="size-1.5 sm:size-2 bg-ember-500/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 sm:size-2 bg-ember-500/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </div>

        {/* Decorative accent line for assistant messages */}
        {!isUser && message.content && (
          <div className="mt-4 w-12 h-px bg-gradient-to-r from-ember-500/30 to-transparent" />
        )}
      </div>
    </div>
  );
}
