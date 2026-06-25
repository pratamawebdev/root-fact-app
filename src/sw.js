/* ============================================================
 *  RootFacts — Service Worker
 *  Menggunakan Workbox CDN agar sw.js bisa dibaca sebagai
 *  Classic Script (tidak bentrok dengan output ESM Webpack).
 * ============================================================ */

importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js",
);

if (!workbox) {
  console.error("❌ Workbox gagal dimuat dari CDN.");
} else {
  console.log("✅ Workbox dimuat.");

  /* ----------------------------------------------------------
   *  PRECACHING
   *  Daftarkan semua aset penting agar aplikasi terbuka penuh
   *  saat offline. File di-cache saat SW pertama kali aktif.
   * ---------------------------------------------------------- */
  workbox.precaching.precacheAndRoute([
    // ── Halaman utama ─────────────────────────────────────────
    { url: "/", revision: "1.0.0" },
    { url: "/index.html", revision: "1.0.0" },

    // ── Web App Manifest & ikon ────────────────────────────────
    { url: "/manifest.json", revision: "1.0.0" },
    { url: "/favicon.ico", revision: "1.0.0" },
    { url: "/icons/icon-192x192.png", revision: "1.0.0" },
    { url: "/icons/icon-512x512.png", revision: "1.0.0" },
    { url: "/icons/apple-touch-icon.png", revision: "1.0.0" },

    // ── Model TensorFlow.js (Computer Vision) ─────────────────
    // Tanpa ketiga file ini, fitur deteksi sayuran tidak berjalan offline.
    { url: "/model/model.json", revision: "1.0.0" },
    { url: "/model/metadata.json", revision: "1.0.0" },
    { url: "/model/weights.bin", revision: "1.0.0" },
  ]);

  /* ----------------------------------------------------------
   *  RUNTIME CACHING
   *  Strategi per-kategori URL agar setiap jenis resource
   *  mendapat perlakuan yang sesuai kebutuhannya.
   * ---------------------------------------------------------- */

  // ── 1. Bundle JS & CSS hasil Webpack (Cache First) ──────────
  // Aset statis yang di-hash oleh Webpack tidak berubah selama
  // versi sama → aman di-cache lama, sertakan status 0 agar
  // opaque response (cross-origin) juga ter-cache.
  workbox.routing.registerRoute(
    /\.(?:js|css)$/i,
    new workbox.strategies.CacheFirst({
      cacheName: "static-bundles-cache",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  );

  // ── 2. Gambar & ikon lokal (Cache First) ────────────────────
  workbox.routing.registerRoute(
    /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/i,
    new workbox.strategies.CacheFirst({
      cacheName: "images-cache",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  );

  // ── 3. Google Fonts stylesheet (Stale While Revalidate) ─────
  // Sheet-nya kecil & jarang berubah; SWR beri respons cepat
  // sambil refresh di background agar selalu up-to-date.
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.googleapis\.com\//i,
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: "google-fonts-stylesheet",
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  );

  // ── 4. Google Fonts file font (Cache First) ─────────────────
  // File font binary tidak pernah berubah untuk URL yang sama.
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.gstatic\.com\//i,
    new workbox.strategies.CacheFirst({
      cacheName: "google-fonts-webfonts",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 tahun
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  );

  // ── 5. Lucide icons (unpkg CDN) — Cache First ───────────────
  // File JS ikon statis & di-versi oleh URL → cache aman 30 hari.
  workbox.routing.registerRoute(
    /^https:\/\/unpkg\.com\//i,
    new workbox.strategies.CacheFirst({
      cacheName: "cdn-icons-cache",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  );

  // ── 6. Hugging Face CDN — model Transformers.js (Cache First)
  // File model generatif (flan-t5-small) berukuran besar; setelah
  // diunduh pertama kali saat online, selanjutnya selalu dari cache
  // sehingga fun fact tetap bisa digenerate tanpa internet.
  // Catatan: Transformers.js juga menyimpan di transformers-cache
  // (IndexedDB) — runtime caching ini menjadi lapisan kedua.
  workbox.routing.registerRoute(
    /^https:\/\/(huggingface\.co|cdn-lfs[\w.-]*\.huggingface\.co)\//i,
    new workbox.strategies.CacheFirst({
      cacheName: "hf-model-cache",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  );

  // ── 7. API eksternal (Network First) ────────────────────────
  // Data API perlu fresh jika online; fallback cache jika offline.
  workbox.routing.registerRoute(
    /^https:\/\/api\./i,
    new workbox.strategies.NetworkFirst({
      cacheName: "api-responses-cache",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 1 hari
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  );
}
