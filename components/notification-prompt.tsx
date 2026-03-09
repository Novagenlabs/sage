"use client";

import { Bell, BellOff, BellRing, Loader2, Send } from "lucide-react";
import { usePushNotifications } from "@/lib/use-push-notifications";

export function NotificationPrompt() {
  const { permission, isSubscribed, isLoading, error, subscribe, unsubscribe, sendTest } =
    usePushNotifications();

  const isUnavailable = permission === "unsupported";

  return (
    <div className="glass rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg border ${
              isSubscribed
                ? "bg-ember-500/10 border-ember-500/20"
                : "bg-chamber-800/50 border-chamber-700/30"
            }`}
          >
            {isSubscribed ? (
              <BellRing className="w-4 h-4 text-ember-400" />
            ) : (
              <BellOff className="w-4 h-4 text-chamber-500" />
            )}
          </div>
          <div>
            <h3 className="font-display text-base font-medium text-chamber-200">
              Notifications
            </h3>
            <p className="text-xs text-chamber-500 mt-0.5">
              {error
                ? error
                : isUnavailable
                  ? "Not available on this device"
                  : permission === "denied"
                    ? "Blocked in browser settings"
                    : isSubscribed
                      ? "You will be notified when insights are ready"
                      : "Get notified when your insights are ready"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Test notification button (only when subscribed in dev) */}
          {isSubscribed && process.env.NODE_ENV !== "production" && (
            <button
              onClick={sendTest}
              className="p-2 text-chamber-500 hover:text-chamber-300 hover:bg-chamber-800/50 rounded-lg transition-colors"
              title="Send test notification"
            >
              <Send className="w-4 h-4" />
            </button>
          )}

          {isUnavailable ? (
            <span className="text-xs text-chamber-600 px-3 py-1.5">
              Not supported
            </span>
          ) : permission === "denied" ? (
            <span className="text-xs text-chamber-600 px-3 py-1.5">
              Re-enable in browser
            </span>
          ) : (
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isSubscribed
                  ? "text-chamber-400 hover:text-chamber-200 hover:bg-chamber-800/50"
                  : "bg-ember-500 hover:bg-ember-400 text-white shadow-lg shadow-ember-500/20"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bell className="w-3.5 h-3.5" />
              )}
              {isSubscribed ? "Disable" : "Enable"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
