"use client";

import { clsx } from "clsx";
import { X, MessageCircle, Plus, History } from "lucide-react";

interface PastConversation {
  id: string;
  title: string | null;
  summary: string | null;
  updatedAt: string;
}

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: PastConversation[];
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  currentConversationId: string | null;
}

export function ChatHistoryDrawer({
  isOpen,
  onClose,
  conversations,
  onSelectConversation,
  onNewConversation,
  currentConversationId,
}: ChatHistoryDrawerProps) {
  const handleSelect = (id: string) => {
    onSelectConversation(id);
    onClose();
  };

  const handleNew = () => {
    onNewConversation();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw]",
          "bg-gray-900/95 backdrop-blur-xl border-r border-white/10",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold text-white">Chat History</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* New Conversation Button */}
          <div className="p-3 border-b border-white/5">
            <button
              onClick={handleNew}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">New Conversation</span>
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No previous conversations</p>
                <p className="text-xs text-gray-600 mt-1">Start a new conversation to see it here</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={clsx(
                    "w-full text-left p-3 rounded-xl transition-all",
                    currentConversationId === conv.id
                      ? "bg-blue-500/20 border border-blue-500/40 shadow-lg shadow-blue-500/10"
                      : "bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      currentConversationId === conv.id
                        ? "bg-blue-500/30"
                        : "bg-white/10"
                    )}>
                      <MessageCircle className={clsx(
                        "w-4 h-4",
                        currentConversationId === conv.id
                          ? "text-blue-400"
                          : "text-gray-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        "text-sm font-medium truncate",
                        currentConversationId === conv.id
                          ? "text-blue-300"
                          : "text-gray-300"
                      )}>
                        {conv.title || conv.summary?.slice(0, 40) || "Untitled conversation"}
                      </p>
                      {conv.summary && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {conv.summary}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-600 mt-1.5">
                        {new Date(conv.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
