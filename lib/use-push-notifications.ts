"use client";

import { useState, useEffect, useCallback } from "react";
import { registerServiceWorker } from "./service-worker";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        setPermission("unsupported");
        return;
      }

      const hasNotification = "Notification" in window;
      const hasSW = "serviceWorker" in navigator;

      if (!hasNotification || !hasSW) {
        setPermission("unsupported");
        return;
      }

      setPermission(Notification.permission as PermissionState);

      // Check if already subscribed
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setIsSubscribed(!!sub))
        .catch((err) => {
          console.error("[Push] Failed to check subscription:", err);
          setError("Could not check notification status");
        });
    } catch (err) {
      console.error("[Push] Init error:", err);
      setPermission("unsupported");
      setError("Notifications not available");
    }
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await registerServiceWorker();
      if (!reg) throw new Error("Service worker not available");

      await reg.update();

      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") return false;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID public key not configured");

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      // Send subscription to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) throw new Error("Failed to save subscription");

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error("[Push] Subscribe error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (error) {
      console.error("[Push] Unsubscribe error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    const response = await fetch("/api/push/test", { method: "POST" });
    return response.ok;
  }, []);

  return { permission, isSubscribed, isLoading, error, subscribe, unsubscribe, sendTest };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
