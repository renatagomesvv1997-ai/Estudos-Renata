/* Service worker do Lei em Questões — cache offline (app shell).

   CORREÇÃO IMPORTANTE:
   A versão anterior usava estratégia "cache primeiro" com um nome de cache fixo
   ("leq-v1"). Resultado: depois de instalado no celular, o app NUNCA mais
   atualizava — você publicava a versão nova no GitHub e o aparelho continuava
   servindo a antiga do cache, dando a impressão de que o envio tinha falhado.

   Agora: o HTML vai buscar a versão nova na rede primeiro (e só usa o cache se
   estiver sem internet). Ícones e manifest continuam vindo do cache, que é
   rápido e não muda. Basta trocar CACHE abaixo para forçar a atualização.      */

var CACHE = "leq-v3";
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

  var ehPagina = req.mode === "navigate" || req.destination === "document"
              || req.url.indexOf("index.html") !== -1;

  if (ehPagina) {
    // REDE PRIMEIRO: sempre pega a versão mais nova publicada no GitHub.
    e.respondWith(
      fetch(req).then(function (resp) {
        var copia = resp.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copia).catch(function () {}); });
        return resp;
      }).catch(function () {
        // sem internet: usa a última versão guardada
        return caches.match("./index.html").then(function (c) { return c || caches.match("./"); });
      })
    );
    return;
  }

  // Demais arquivos (ícones, manifest): cache primeiro, que é rápido.
  e.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (resp) {
        var copia = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia).catch(function () {}); });
        return resp;
      }).catch(function () { return cached; });
    })
  );
});
