/* سراج: service worker
   - خود برنامه: اول شبکه (برای دریافت نسخهٔ جدید)، در صورت قطعی یا کندی کش
   - فونت‌ها: کش با به‌روزرسانی پس‌زمینه
   - صوت تلاوت: هرگز کش نمی‌شود (حجیم است و به اینترنت نیاز دارد) */
var V = 'seraj-v3';
var CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function networkFirst(req, ms) {
  return new Promise(function (resolve) {
    var done = false;
    var timer = setTimeout(function () {
      caches.match(req, { ignoreSearch: true }).then(function (r) { if (r && !done) { done = true; resolve(r); } });
    }, ms);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); }
      if (!done) { done = true; resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      caches.match(req, { ignoreSearch: true }).then(function (r) {
        if (done) return;
        done = true;
        resolve(r || caches.match('./index.html') || Response.error());
      });
    });
  });
}

function staleWhileRevalidate(req) {
  return caches.open(V).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  var u = new URL(req.url);
  if (/mp3quran\.net|everyayah\.com|islamic\.network/.test(u.hostname) || /\.mp3$/.test(u.pathname)) return;
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (u.origin === self.location.origin) {
    e.respondWith(networkFirst(req, 4000));
  }
});
