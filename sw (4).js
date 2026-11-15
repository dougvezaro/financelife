/* Controle Financeiro Simplificado — guarda o próprio app no aparelho para abrir sem internet.
   Só guarda os arquivos do app (código e ícones). Os seus dados financeiros NÃO passam por aqui:
   eles ficam no armazenamento do aparelho e nunca são enviados para lugar nenhum.
   Atualização: com internet, a página do app vem sempre da versão publicada (rede primeiro);
   sem internet, abre a última cópia guardada. */
var CACHE = 'controle-financeiro-v12';
var ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icone-180.png', './icone-192.png', './icone-512.png', './icone-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // cache: 'reload' ignora o cache do navegador e garante os arquivos recém-publicados
    return c.addAll(ARQUIVOS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (new URL(req.url).searchParams.has('nocache')) return; // conferência de versão: sempre direto da internet
  if (req.mode === 'navigate') {
    // Página do app: rede primeiro (sempre a versão mais nova); sem internet, a cópia guardada.
    e.respondWith(caches.open(CACHE).then(function (cache) {
      return fetch(req.url, { cache: 'no-store' }).then(function (r) {
        if (r && r.ok) { cache.put('./index.html', r.clone()); return r; }
        return cache.match('./index.html').then(function (s) { return s || r; });
      }).catch(function () {
        return cache.match('./index.html').then(function (s) {
          return s || new Response('Sem conexão e sem cópia guardada do app.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        });
      });
    }));
    return;
  }
  // Ícones e demais arquivos: cópia guardada, atualizada em segundo plano.
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (salvo) {
      var rede = fetch(req, { cache: 'no-cache' }).then(function (r) { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(function () { return null; });
      if (salvo) { e.waitUntil(rede); return salvo; }
      return rede.then(function (r) { return r || new Response('', { status: 503 }); });
    });
  }));
});
