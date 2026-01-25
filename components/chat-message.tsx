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
        "flex gap-3 sm:gap-4 px-3 sm:px-4 py-4 sm:py-6",
        isUser ? "bg-transparent" : "bg-white/[0.02]"
      )}
    >
      {/* Avatar - Smaller on mobile */}
      {isUser ? (
        <div className="flex-shrink-0 size-7 sm:size-8 rounded-full flex items-center justify-center bg-stone-700">
          <User className="size-4 sm:size-5 text-white/80" />
        </div>
      ) : (
        <LogoOrb size={28} className="sm:hidden" />
      )}
      {!isUser && <LogoOrb size={32} className="hidden sm:block" />}

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-xs sm:text-sm text-gray-300">
            {isUser ? "You" : "Sage"}
          </span>
          {message.phase && !isUser && (
            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">
              {message.phase}
            </span>
          )}
        </div>

        {/* Message content */}
        <div className="prose-chat text-sm sm:text-base text-gray-100 whitespace-pre-wrap leading-relaxed">
          {message.content}
          {isLatest && !isUser && !message.content && (
            <span className="inline-flex gap-1" role="status" aria-label="Loading">
              <span className="size-1.5 sm:size-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="size-1.5 sm:size-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 sm:size-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
