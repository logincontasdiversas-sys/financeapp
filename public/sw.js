const CACHE_NAME = 'finance-app-v1.1';
const ASSET_REGEX = /\.(?:js|css|ico|svg|png|jpg|jpeg|webp|woff2?)$/i;
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first para navegações (HTML) e assets principais (js/css), para garantir atualização
  if (request.mode === 'navigate' || ASSET_REGEX.test(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          // Verificar se a URL é válida para cache antes de tentar armazenar
          if (request.url.startsWith('http') && 
              !request.url.startsWith('chrome-extension://') &&
              !request.url.startsWith('moz-extension://') &&
              !request.url.startsWith('safari-extension://')) {
            try {
              cache.put(request, networkResponse.clone());
            } catch (cacheError) {
              console.warn('Cache put failed:', cacheError);
            }
          }
          return networkResponse;
        } catch (error) {
          console.warn('Network request failed:', error);
          const cached = await caches.match(request);
          if (cached) return cached;
          // fallback básico à raiz
          return caches.match('/') || fetch(request);
        }
      })()
    );
    return;
  }

  // Cache-first para demais requests (imagens, etc.)
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'Notificação', body: event.data && event.data.text ? event.data.text() : 'Você possui uma nova notificação.' };
  }

  const title = data.title || 'FinanceApp';
  const options = {
    body: data.body || 'Você possui uma nova notificação.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.url || '/', ts: Date.now() },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.registration.scope.replace(/\/$/, ''))) {
            client.focus();
            client.postMessage({ type: 'notification-click', url: targetUrl });
            return;
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});