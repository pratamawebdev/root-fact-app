importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js");

if (workbox) {
  const CACHE_REVISION = "1.0.2";

  self.skipWaiting();
  workbox.core.clientsClaim();

  workbox.precaching.precacheAndRoute([
    { url: "/", revision: CACHE_REVISION },
    { url: "/index.html", revision: CACHE_REVISION },
    { url: "/app.bundle.js", revision: CACHE_REVISION },
    { url: "/app.css", revision: CACHE_REVISION },
    { url: "/manifest.json", revision: CACHE_REVISION },
    { url: "/favicon.ico", revision: CACHE_REVISION },
    { url: "/icons/apple-touch-icon.png", revision: CACHE_REVISION },
    { url: "/icons/icon-192x192.png", revision: CACHE_REVISION },
    { url: "/icons/icon-512x512.png", revision: CACHE_REVISION },
    { url: "/screenshots/screenshot1.png", revision: CACHE_REVISION },
    { url: "/screenshots/screenshot2.png", revision: CACHE_REVISION },
    { url: "/model/model.json", revision: CACHE_REVISION },
    { url: "/model/metadata.json", revision: CACHE_REVISION },
    { url: "/model/weights.bin", revision: CACHE_REVISION }
  ]);

  workbox.routing.registerRoute(
    ({ url }) => url.origin === "https://fonts.googleapis.com",
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: "google-fonts-stylesheets",
    }),
  );

  workbox.routing.registerRoute(
    ({ url }) => url.origin === "https://fonts.gstatic.com",
    new workbox.strategies.CacheFirst({
      cacheName: "google-fonts-webfonts",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        }),
      ],
    }),
  );

  workbox.routing.registerRoute(
    ({ url }) => url.origin === "https://unpkg.com",
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: "cdn-assets-cache",
    }),
  );
} else {
  console.log("Workbox gagal dimuat");
}
