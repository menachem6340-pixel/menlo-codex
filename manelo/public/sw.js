const CACHE_NAME = "manelo-codex-pwa-2026-05-11-5";
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/logo-icon.svg?v=2026-05-11-5",
  "/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (["script", "style", "image", "font", "manifest"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => offlineResponse())
    );
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || fresh;
}

function offlineResponse() {
  return new Response(
    `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>מנלו קודקס</title><body style="font-family:system-ui,sans-serif;margin:0;background:#fafafa;color:#1a1a1a"><main style="min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center"><div style="max-width:380px;border:1px solid #e5e5e5;background:white;border-radius:14px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.06)"><img src="/logo-icon.svg?v=2026-05-11-5" alt="" width="64" height="64" style="margin-bottom:12px"><h1 style="margin:0 0 8px;font-size:22px">אין חיבור למנלו קודקס</h1><p style="margin:0;color:#666;line-height:1.5">בדוק שהאינטרנט זמין, ואז רענן. אם אתה עובד מקומית, ודא שהשרת פתוח.</p></div></main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
