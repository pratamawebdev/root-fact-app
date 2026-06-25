/**
 * RootFacts — Service Worker
 *
 * File ini diproses oleh WorkboxWebpackPlugin.InjectManifest, yang:
 *  1. Mengganti `self.__WB_MANIFEST` dengan daftar file precache yang
 *     dihasilkan secara otomatis oleh Webpack (termasuk file dari
 *     additionalManifestEntries).
 *  2. Me-bundle semua import Workbox di bawah ke dalam sw.js,
 *     sehingga Service Worker benar-benar bekerja OFFLINE tanpa
 *     perlu mengunduh Workbox dari CDN.
 */

import { clientsClaim } from "workbox-core";
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// ── Lifecycle ────────────────────────────────────────────────────────────────
// Aktifkan service worker baru langsung setelah build terbaru terpasang.
self.skipWaiting();
clientsClaim();

// ── Precaching ────────────────────────────────────────────────────────────────
// self.__WB_MANIFEST diisi oleh InjectManifest saat build.
// Berisi aset Webpack, model AI, file WASM/MJS runtime, ikon, manifest, dan sw.js.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Fallback navigasi agar reload halaman tetap membuka index.html saat offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

// ── Runtime Caching ───────────────────────────────────────────────────────────

// 1. Bundle JS & CSS lokal — Cache First
//    Aset ini di-hash oleh Webpack, tidak berubah untuk URL yang sama.
registerRoute(
  ({ request }) =>
    request.destination === "script" || request.destination === "style",
  new CacheFirst({
    cacheName: "static-bundles-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// 2. Gambar & ikon lokal — Cache First
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// 3. Google Fonts stylesheet — Stale While Revalidate
//    Respons cepat dari cache, diperbarui di background.
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts-stylesheet",
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

// 4. Google Fonts file font — Cache First
//    File binary tidak berubah untuk URL yang sama.
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// 5. Lucide CDN (unpkg) — Cache First
//    File JS ikon statis & di-versi di URL.
registerRoute(
  ({ url }) => url.origin === "https://unpkg.com",
  new CacheFirst({
    cacheName: "cdn-icons-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// 6. Hugging Face CDN — Cache First
//    Model Transformers.js (flan-t5-small) berukuran besar.
//    Download pertama saat online, lalu offline selamanya.
registerRoute(
  ({ url }) =>
    url.hostname === "huggingface.co" ||
    url.hostname.endsWith(".huggingface.co"),
  new CacheFirst({
    cacheName: "hf-model-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// 7. Aset AI lokal tambahan — Cache First
//    Menangkap file model/metadata/weights, MJS, dan WASM jika ada request baru
//    yang belum masuk precache pada build berikutnya.
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/model/") ||
      url.pathname.endsWith(".wasm") ||
      url.pathname.endsWith(".mjs")),
  new CacheFirst({
    cacheName: "ai-runtime-assets-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// 8. API eksternal — Network First
//    Utamakan data terbaru; fallback ke cache jika offline.
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);
