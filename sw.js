/* Service worker do Lei em Questões — cache offline simples (app shell). */
var CACHE = "leq-v1";
var ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(ASSETS).catch(function () {});
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  // Não intercepta chamadas à API da Anthropic (deixa ir direto à rede).
  if (req.url.indexOf("api.anthropic.com") !== -1) return;
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        return resp;
      }).catch(function () {
        // fallback: se for navegação, devolve o app shell
        if (req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
