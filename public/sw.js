const CACHE_NAME = "mm-cache-v2";
const STATIC_PATTERNS = ["/_next/static/", "/icon.svg", "/manifest.json"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) return;
  const url = new URL(event.request.url);
  const isStatic = STATIC_PATTERNS.some((p) => url.pathname.startsWith(p));
  if (isStatic) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => { if (res.ok) cache.put(event.request, res.clone()); return res; });
        })
      )
    );
  } else {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (event.request.mode === "navigate" && res.ok)
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(event.request).then(
          (cached) => cached || new Response('{"error":"offline"}', { status: 503, headers: { "Content-Type": "application/json" } })
        ))
    );
  }
});
