"use client";

import { clsx } from "clsx";
import { Lightbulb, RotateCcw, Info, X, FileText, Sparkles, LogOut, User, Coins } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import type { Insight } from "@/lib/types";

interface UserData {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  credits?: number;
}

interface SidebarProps {
  insights: Insight[];
  problemStatement: string;
  onReset: () => void;
  isOpen: boolean;
  onClose: () => void;
  voiceSummary?: string;
  voiceReflections?: string[];
  user?: UserData | null;
}

export function Sidebar({ insights, problemStatement, onReset, isOpen, onClose, voiceSummary, voiceReflections, user }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed lg:static inset-y-0 right-0 z-50",
          "w-80 bg-gray-900 border-l border-gray-800",
          "transform transition-transform duration-300 ease-in-out",
          "lg:transform-none",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="font-semibold text-gray-200">Session</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* User Profile Section */}
          <div className="p-4 border-b border-gray-800">
            {user ? (
              <div className="space-y-3">
                {/* User info row */}
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || "User"}
                      className="w-10 h-10 rounded-full ring-1 ring-gray-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center ring-1 ring-gray-600">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Credits and Sign out row */}
                <div className="flex items-center gap-2">
                  {typeof user.credits === "number" && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-medium text-amber-400">
                        {user.credits.toLocaleString()} credits
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors ml-auto"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="text-xs">Sign out</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg transition-colors"
              >
                <User className="w-4 h-4 text-gray-300" />
                <span className="text-sm font-medium text-gray-200">Sign in</span>
              </Link>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Problem Statement / Topic */}
            {problemStatement && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-medium text-gray-300">Investigating</h3>
                </div>
                <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3">
                  {problemStatement.length > 150
                    ? problemStatement.slice(0, 150) + "..."
                    : problemStatement}
                </p>
              </div>
            )}

            {/* Voice Summary */}
            {voiceSummary && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-medium text-gray-300">Summary</h3>
                </div>
                <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3 leading-relaxed">
                  {voiceSummary}
                </p>
              </div>
            )}

            {/* Insights / Key Points */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-medium text-gray-300">
                  {voiceSummary ? "Key Points" : "Insights"}
                </h3>
                <span className="text-xs text-gray-500">({insights.length})</span>
              </div>
              {insights.length > 0 ? (
                <ul className="space-y-2">
                  {insights.map((insight) => (
                    <li
                      key={insight.id}
                      className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3"
                    >
                      {insight.content}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 italic">
                  {voiceSummary
                    ? "Key points will appear after the conversation ends."
                    : "Insights will appear here as they emerge from the dialogue."}
                </p>
              )}
            </div>

            {/* Voice Reflections */}
            {voiceReflections && voiceReflections.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-medium text-gray-300">Reflections</h3>
                </div>
                <ul className="space-y-2">
                  {voiceReflections.map((reflection, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-400 bg-purple-900/20 border border-purple-500/20 rounded-lg p-3 italic"
                    >
                      &ldquo;{reflection}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Dialogue</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
