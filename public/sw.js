// Service Worker for PWA
const CACHE_NAME = 'vct-fantasy-v1.2';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/team',
  '/market',
  '/ranking',
  '/manifest.json',
  '/offline',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache, adding static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Cache strategies
const isImage = (url) => {
  return url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) || url.includes('supabase.co/storage/v1/object/public/');
};

const isFont = (url) => {
  return url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com');
};

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Skip API calls (except Supabase storage for images)
  if (url.includes('/api/') || (url.includes('/_next/') && !url.includes('static'))) {
    return;
  }

  // Strategy: Stale-While-Revalidate for images and fonts
  if (isImage(url) || isFont(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchedResponse = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
          return cachedResponse || fetchedResponse;
        });
      })
    );
    return;
  }

  // Strategy: Network First, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we got a valid response, cache it (if it's not a partial/error)
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If navigation request and not in cache, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline');
          }
          
          return null;
        });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch (e) {
    data = { title: 'VCT Fantasy', body: event.data?.text() };
  }
  
  const title = data.title || 'VCT Fantasy';
  const options = {
    body: data.body || 'Nueva actualización disponible',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    data: data.url || '/dashboard'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/dashboard')
  );
});
