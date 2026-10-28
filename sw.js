/* Service Worker для PWA «МАКС — вход в веб-версию».
   Эз5/старый Chromium-совместимый. Allowed on HTTPS only (GitHub Pages подходит). */

var CACHE_NAME = "max-pwa-v1";
/* Кэшируем только статические файлы самой PWA. Сам web.max.ru НЕ кэшируем
   (чужие ресурсы нельзя кэшировать надежно и безопасно). */
var URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) {
          return n !== CACHE_NAME;
        }).map(function (n) {
          return caches.delete(n);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var reqUrl;
  try {
    reqUrl = new URL(event.request.url);
  } catch (e) {
    return;
  }

  /* Стратегия: для навигационных запросов отдаём index.html из кэша (offline fallback). */
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  /* Статика: cache-first. */
  if (reqUrl.pathname.indexOf("/icons/") === 0 ||
      reqUrl.pathname.indexOf("manifest.json") !== -1) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) { return cached; }
        return fetch(event.request).then(function (resp) {
          if (resp && resp.ok) {
            var copy = resp.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return resp;
        });
      })
    );
  }

  /* Всё остальное (в т.ч. web.max.ru и любые внешние ресурсы) — только сеть,
     офлайн-перехват НЕ применяем к чужим хостам. */
});