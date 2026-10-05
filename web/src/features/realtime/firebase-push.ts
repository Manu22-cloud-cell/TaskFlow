import { clientApi } from '@/lib/client-api';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const cacheName = 'taskflow-push-owner';
const ownerUrl = '/__taskflow_push_owner';

let registrationGeneration = 0;

export async function bindPushOwner(userId: number | null) {
  if (userId === null) registrationGeneration++;
  if (!('caches' in window)) return;
  const cache = await caches.open(cacheName);
  await cache.put(ownerUrl, new Response(JSON.stringify({ userId })));
  if (userId === null && 'serviceWorker' in navigator) {
    const registration =
      await navigator.serviceWorker.getRegistration('/firebase-push/');
    const notifications = await registration?.getNotifications();
    notifications?.forEach((notification) => notification.close());
  }
}

export async function firebaseMessaging() {
  if (
    !window.isSecureContext ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator)
  )
    throw new Error(
      'Push requires HTTPS or localhost and a supported browser.',
    );
  if (
    !config.apiKey ||
    !config.projectId ||
    !config.messagingSenderId ||
    !config.appId ||
    !vapidKey
  )
    throw new Error('Firebase web configuration is missing.');
  const sdk = await import('firebase/messaging');
  if (!(await sdk.isSupported()))
    throw new Error('Firebase push is not supported in this browser.');
  const { initializeApp, getApps } = await import('firebase/app');
  const app =
    getApps().find((item) => item.name === 'taskflow') ??
    initializeApp(config, 'taskflow');
  return { sdk, messaging: sdk.getMessaging(app) };
}

export async function enableFirebasePush(userId: number, signal?: AbortSignal) {
  const generation = registrationGeneration;
  const assertActive = () => {
    if (signal?.aborted || generation !== registrationGeneration)
      throw new Error('Push setup cancelled because the session changed.');
  };
  const { sdk, messaging } = await firebaseMessaging();
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(config))}`,
    { scope: '/firebase-push/' },
  );
  // The SDK only waits for its default worker; a custom registration must be active first.
  if (!registration.active) {
    await new Promise<void>((resolve, reject) => {
      const worker = registration.installing ?? registration.waiting;
      if (!worker) {
        reject(new Error('Push service worker could not start.'));
        return;
      }
      const finish = (error?: Error) => {
        clearTimeout(timer);
        worker.removeEventListener('statechange', check);
        if (error) reject(error);
        else resolve();
      };
      const check = () => {
        if (worker.state === 'activated') finish();
        else if (worker.state === 'redundant')
          finish(new Error('Push service worker installation failed.'));
      };
      const timer = window.setTimeout(
        () => finish(new Error('Push service worker timed out.')),
        15_000,
      );
      worker.addEventListener('statechange', check);
      check();
    });
  }
  assertActive();
  const token = await sdk.getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  assertActive();
  if (!token) throw new Error('Firebase did not return a browser token.');
  await clientApi.post('/push/subscriptions', { token });
  assertActive();
  await bindPushOwner(userId);
  localStorage.setItem('taskflow-fcm-token', token);
  localStorage.setItem(`taskflow-fcm-enabled:${userId}`, 'true');
}

export async function disableFirebasePush(userId: number) {
  await bindPushOwner(null);
  localStorage.removeItem(`taskflow-fcm-enabled:${userId}`);
  const token = localStorage.getItem('taskflow-fcm-token');
  if (token) await clientApi.delete('/push/subscriptions', { data: { token } });
  const { sdk, messaging } = await firebaseMessaging();
  await sdk.deleteToken(messaging);
  localStorage.removeItem('taskflow-fcm-token');
}
