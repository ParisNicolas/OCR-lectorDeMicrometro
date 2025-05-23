const CACHE_NAME = "ocr-cache-v6.6";
const urlsToCache = [
  "./",
  "./index.html",
  "./dist/output.css",
  "./src/script.js",
  "./src/app.js",
  "./src/tesseract.min.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/base.mp3",
  "./assets/chapa.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name); // elimina caches viejos
          }
        })
      );
    })
  );
});