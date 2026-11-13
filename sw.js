// Service Worker: macht die App installierbar und lädt sie auch ohne Netz.
// - Seite (index.html): erst Netz (damit Updates sofort ankommen), sonst Cache
// - Bibliotheken vom CDN (feste Versionen): erst Cache, sonst Netz
// - Firestore-Daten laufen NICHT hierüber, die puffert Firestore selbst (enablePersistence)
const CACHE = "hsg-kasse-v1";
const CDN_HOSTS = ["www.gstatic.com", "unpkg.com", "cdnjs.cloudflare.com"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(["/", "/manifest.webmanifest", "/icons/icon-192.png"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("/", copy));
      }
      return res;
    }).catch(() => caches.match("/")));
    return;
  }

  const istCdn = CDN_HOSTS.includes(url.hostname) && (url.hostname !== "www.gstatic.com" || url.pathname.startsWith("/firebasejs/"));
  if (istCdn || url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    })));
  }
});
