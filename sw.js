/**
 * Alpha Classes — Progressive Web App Service Worker
 * Enables offline caching, fast launches, and installability on iOS and Android.
 */

const CACHE_NAME = 'alpha-classes-v1.0';

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

// Install: Cache core application assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ Alpha Classes SW: Caching app assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Non-critical cache pre-fetch warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 Alpha Classes SW: Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for Firestore API / CDN, Stale-while-revalidate for local assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Allow Firebase and external APIs to go directly to network
  if (url.origin.includes('firestore.googleapis.com') ||
      url.origin.includes('firebaseio.com') ||
      url.origin.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached asset immediately if available, fetch update in background
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network offline, return cached or fallback
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

