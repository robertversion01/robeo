/* Robeo service worker — Web Push + stale-while-revalidate cache. */
(function () {
  const BUILD =
    new URL(self.location.href).searchParams.get('v') ||
    self.registration?.scope?.match(/[?&]v=([^&]+)/)?.[1] ||
    '1';

  const CACHE_STATIC = 'robeo-static-' + BUILD;
  const CACHE_IMAGES = 'robeo-images-' + BUILD;

  const MAX_STATIC = 96;
  const MAX_IMAGES = 220;
  const IMAGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  const STATIC_PATH_RE = /\/_next\/static\//;
  const IMAGE_EXT_RE = /\.(webp|avif|jpe?g|png|gif)(\?|$)/i;

  function isSupabaseStorage(url) {
    try {
      return (
        url.hostname.endsWith('.supabase.co') &&
        (url.pathname.includes('/storage/v1/object/') ||
          url.pathname.includes('/storage/v1/render/image/'))
      );
    } catch {
      return false;
    }
  }

  function isCacheableImage(url) {
    return isSupabaseStorage(url) || IMAGE_EXT_RE.test(url.pathname);
  }

  function shouldBypassCache(url, request) {
    if (request.method !== 'GET') return true;
    if (request.headers.get('Save-Data') === 'on') return true;
    if (url.pathname.startsWith('/api/')) return true;
    if (url.pathname === '/sw.js') return true;
    if (url.pathname.includes('/auth/')) return true;
    if (request.mode === 'navigate') return true;
    return false;
  }

  function isFresh(response, maxAgeMs) {
    const dateHeader = response.headers.get('date');
    if (!dateHeader) return true;
    const age = Date.now() - new Date(dateHeader).getTime();
    return age < maxAgeMs;
  }

  async function trimCache(cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    const excess = keys.length - maxEntries;
    for (let i = 0; i < excess; i += 1) {
      await cache.delete(keys[i]);
    }
  }

  async function staleWhileRevalidate(request, cacheName, maxEntries, maxAgeMs) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const networkPromise = fetch(request)
      .then((response) => {
        if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
          cache.put(request, response.clone());
          void trimCache(cacheName, maxEntries);
        }
        return response;
      })
      .catch(function () {
        return null;
      });

    if (cached && isFresh(cached, maxAgeMs)) {
      void networkPromise;
      return cached;
    }

    const fresh = await networkPromise;
    if (fresh) return fresh;
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }

  async function cacheFirstImmutable(request, cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      void trimCache(cacheName, maxEntries);
    }
    return response;
  }

  self.addEventListener('install', function (event) {
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener('activate', function (event) {
    event.waitUntil(
      (async function () {
        const keys = await caches.keys();
        const keep = new Set([CACHE_STATIC, CACHE_IMAGES]);
        await Promise.all(
          keys
            .filter(function (key) {
              return key.startsWith('robeo-') && !keep.has(key);
            })
            .map(function (key) {
              return caches.delete(key);
            }),
        );
        await self.clients.claim();
      })(),
    );
  });

  self.addEventListener('fetch', function (event) {
    const request = event.request;
    if (request.method !== 'GET') return;

    var url;
    try {
      url = new URL(request.url);
    } catch {
      return;
    }

    if (url.origin !== self.location.origin && !isSupabaseStorage(url)) return;
    if (shouldBypassCache(url, request)) return;

    if (STATIC_PATH_RE.test(url.pathname)) {
      event.respondWith(cacheFirstImmutable(request, CACHE_STATIC, MAX_STATIC));
      return;
    }

    if (isCacheableImage(url)) {
      event.respondWith(staleWhileRevalidate(request, CACHE_IMAGES, MAX_IMAGES, IMAGE_MAX_AGE_MS));
    }
  });

  self.addEventListener('push', function (event) {
    var data = { title: 'Robeo', body: '', url: '/' };
    try {
      if (event.data) data = Object.assign(data, event.data.json());
    } catch {
      /* ignore */
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Robeo', {
        body: data.body || '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { url: data.url || '/' },
      }),
    );
  });

  self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
        for (var i = 0; i < list.length; i += 1) {
          var client = list[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      }),
    );
  });
})();
