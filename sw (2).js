/* Controle Financeiro Simplificado — guarda o próprio app no aparelho para abrir sem internet.
   Só guarda os arquivos do app (código e ícones). Os seus dados financeiros NÃO passam por aqui:
   eles ficam no armazenamento do aparelho e nunca são enviados para lugar nenhum.
   Atualização: ao abrir com internet, a versão nova é baixada em segundo plano e vale na próxima abertura. */
var CACHE = 'controle-financeiro-v10';
var ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icone-180.png', './icone-192.png', './icone-512.png', './icone-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  var chave = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(chave, { ignoreSearch: true }).then(function (salvo) {
      var rede = fetch(req).then(function (r) { if (r && r.ok) cache.put(chave, r.clone()); return r; }).catch(function () { return null; });
      if (salvo) { e.waitUntil(rede); return salvo; }
      return rede.then(function (r) { return r || new Response('Sem conexão e sem cópia guardada deste arquivo.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); });
    });
  }));
});
