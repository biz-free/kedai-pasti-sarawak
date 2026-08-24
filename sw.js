// Background push notifications (FCM) — merged into the same service worker
// as the app-shell cache below so there's only one registration at the root
// scope (a second SW file registered at the same scope would just replace
// this one, breaking offline caching).
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyCT4KG6B-PDe_G4q6RsPcNV47eGEt8_08s",
  authDomain: "pasti-sarawak.firebaseapp.com",
  projectId: "pasti-sarawak",
  storageBucket: "pasti-sarawak.firebasestorage.app",
  messagingSenderId: "79748416198",
  appId: "1:79748416198:web:a48d6a050a2ac777818dc7"
});
try{
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    self.registration.showNotification(n.title || 'Tempahan Baru', {
      body: n.body || '',
      icon: './icon-192.png',
    });
  });
}catch(e){ /* messaging unsupported in this context — ignore */ }

const CACHE_NAME = 'kedai-pasti-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Same-origin app shell only — Firebase/Firestore/auth/CDN requests always
// go straight to the network untouched, so cart/login/order data is never
// served stale.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
      return res;
    }))
  );
});
