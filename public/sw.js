/// <reference lib="webworker" />

const SW_VERSION = "1.0.0";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Push notification handler
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Sage";
  const options = {
    body: data.body || "You have a new update",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "sage-notification",
    renotify: true,
    data: {
      url: data.url || "/chat",
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler — focus existing tab or open new one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/chat";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Try to focus an existing tab
        for (const client of windowClients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return clients.openWindow(url);
      })
  );
});
