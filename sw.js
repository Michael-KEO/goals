const CACHE_NAME = "objectifs2026-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=10",
  "./app.js",
  "./manifest.json?v=2",
  "./icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // Pas de skipWaiting automatique ici : le nouveau SW reste "en attente"
  // jusqu'à ce que l'utilisateur confirme via Réglages > Mise à jour.
});

self.addEventListener("message", (event) => {
  if(event.data && event.data.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fichiers qui changent souvent (code de l'app) -> network-first.
// On va toujours chercher la dernière version sur le réseau ; le cache
// ne sert que de secours si l'iPhone est hors ligne.
const NETWORK_FIRST = ["/index.html", "/app.js", "/"];

function isNetworkFirst(url){
  const path = new URL(url).pathname;
  return NETWORK_FIRST.some((p) => path === p || path.endsWith(p));
}

self.addEventListener("fetch", (event) => {
  if(event.request.method !== "GET") return;

  if(isNetworkFirst(event.request.url)){
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Ressources statiques (CSS, manifest, icône...) -> cache-first, comme avant.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});