// SK B2B Fulfillment — Service Worker
const CACHE_NAME = 'sk-worker-v1';

// 설치 시 기본 파일 캐시
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        '/sk-worker/',
        '/sk-worker/index.html',
        '/sk-worker/manifest.json',
        '/sk-worker/icon-192.png',
        '/sk-worker/icon-512.png'
      ]);
    })
  );
  self.skipWaiting();
});

// 활성화 시 오래된 캐시 삭제
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// 네트워크 우선, 실패 시 캐시 사용 (항상 최신 데이터 유지)
self.addEventListener('fetch', function(event) {
  // GAS API 요청은 캐시 안 함 (항상 실시간)
  if (event.request.url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // 성공하면 캐시 업데이트 후 반환
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(function() {
        // 오프라인 시 캐시에서 반환
        return caches.match(event.request);
      })
  );
});
