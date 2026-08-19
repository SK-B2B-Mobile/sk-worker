// SK B2B Fulfillment — Service Worker
const CACHE_NAME = 'sk-worker-v10'; // ★ 2026-08-19: v9→v10 (GAS 요청을 SW가 가로채서 재fetch하다 CORS로 실패하던 버그 수정)

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
  // ★ 2026-08-19 긴급 수정 — GAS API 요청(스크립트 태그로 하는 JSONP 요청
  //   포함)을 Service Worker가 "안 가로채겠다"는 의도였는데, event.respondWith()를
  //   호출하는 순간 여전히 가로채서 SW 내부에서 fetch()를 대신 실행하게 됨.
  //   이 내부 fetch()가 CORS로 실패하면(오늘 실제로 이렇게 실패함) 원래
  //   요청까지 통째로 실패 처리됨 — 특히 CORS를 우회하려고 새로 추가한
  //   JSONP(<script> 태그) 요청까지 여기 걸려서 똑같이 막혀버렸음.
  //   respondWith()를 아예 호출하지 않으면 브라우저가 이 요청을 SW 없이
  //   완전히 직접 처리해서, 스크립트 태그의 원래 CORS-면제 특성이 살아남음.
  if (event.request.url.includes('script.google.com') || event.request.url.includes('script.googleusercontent.com')) {
    return; // SW가 관여하지 않음 — 브라우저 기본 동작 그대로
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
