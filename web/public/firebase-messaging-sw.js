/* global importScripts, firebase */
// Only public Firebase configuration is provided in the worker URL.
const config = JSON.parse(
  new URL(self.location.href).searchParams.get('config') || '{}',
);

// Register click handling before Firebase installs its own handlers.
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(
    (async () => {
      const cache = await caches.open('taskflow-push-owner');
      const stored = await cache.match('/__taskflow_push_owner');
      const owner = stored ? await stored.json() : {};
      const data = event.notification.data;
      if (!owner.userId || String(owner.userId) !== data?.userId) return;
      const href = /^\/(projects(?:\/\d+)?|tasks\/\d+)$/.test(data.href)
        ? data.href
        : '/projects';
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate(href);
        await existing.focus();
      } else await self.clients.openWindow(href);
    })(),
  );
});

importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js',
);
firebase.initializeApp(config);
firebase.messaging().onBackgroundMessage(async (payload) => {
  const data = payload.data;
  if (
    !data?.id ||
    !data.message ||
    !/^\/(projects(?:\/\d+)?|tasks\/\d+)$/.test(data.href)
  )
    return;
  const cache = await caches.open('taskflow-push-owner');
  const stored = await cache.match('/__taskflow_push_owner');
  const owner = stored ? await stored.json() : {};
  if (!owner.userId || String(owner.userId) !== data.userId) return;
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  if (windows.some((client) => client.visibilityState === 'visible')) return;
  await self.registration.showNotification('TaskFlow', {
    body: data.message,
    tag: `taskflow:${data.userId}:${data.id}`,
    data: { href: data.href, userId: data.userId },
  });
});
