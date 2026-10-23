/**
 * Alpha Classes — Progressive Web App Service Worker (v2.6)
 * Network-First strategy for live data & scripts, offline cache fallback.
 */

const CACHE_NAME = 'alpha-classes-v2.6';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './About.html',
  './Courses.html',
  './Trainer.html',
  './Pricing.html',
  './Contact.html',
  './login.html',
  './portal.html',
  './student-portal.html',
  './style.css',
  './portal.css',
  './Responsive.css',
  './auth.js',
  './portal.js',
  './student-portal.js',
  './firebase-config.js',
  './app-installer.js',
  './manifest.json',
  './images/app-icon-192.png',
  './images/app-icon-512.png',
  './images/apple-touch-icon.png',
  './images/app-icon.svg',
  './images/about.jpg',
  './images/course-1.png',
  './images/medium.png',
  './images/science.png'
];

// Install: Cache core assets and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ Alpha Classes SW: Pre-caching app shell assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Cache pre-fetch warning:', err);
      });
    })
  );
});

// Activate: Remove all previous old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 Alpha Classes SW: Purging old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Always bypass Firebase APIs. Use Network-First for HTML/JS/CSS, Cache-First for static images.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Direct pass-through for Firebase, Google APIs, and external CDNs
  if (url.origin.includes('firestore.googleapis.com') ||
      url.origin.includes('firebaseio.com') ||
      url.origin.includes('googleapis.com') ||
      url.origin.includes('gstatic.com')) {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const isStaticImage = url.pathname.endsWith('.png') ||
                        url.pathname.endsWith('.jpg') ||
                        url.pathname.endsWith('.jpeg') ||
                        url.pathname.endsWith('.svg');

  if (isStaticImage) {
    // Images: Cache-first, network fallback
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML / JS / CSS / JSON: Network-First!
  // Ensures website updates & data changes reflect immediately across installed apps and browsers!
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network offline -> return cached response
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
