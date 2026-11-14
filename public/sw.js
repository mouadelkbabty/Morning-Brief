// Service worker minimal : l'app reste consultable hors ligne.
// - pages : réseau d'abord (toujours le dernier brief), cache en secours ;
// - fichiers statiques versionnés : cache d'abord.
const CACHE = "morning-brief-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  const save = (response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  };

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request).then(save)));
    return;
  }
  event.respondWith(
    fetch(request)
      .then(save)
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match("/"))),
  );
});
