const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  devtool: false,

  optimization: {
    concatenateModules: false,
  },

  plugins: [
    new CleanWebpackPlugin(),

    new WorkboxWebpackPlugin.GenerateSW({
      swDest: "sw.js",

      // ─── Batas ukuran file untuk precaching ──────────────────────────────
      // weights.bin ~2.1 MB — naikkan batas agar seluruh aset masuk precache.
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB

      cleanupOutdatedCaches: true,

      // ─── Precache aset statis yang disalin CopyWebpackPlugin ─────────────
      // GenerateSW hanya memprecache file yang dihasilkan Webpack secara
      // langsung (bundle JS). File yang disalin via CopyWebpackPlugin —
      // yaitu model TF.js, ikon, dan manifest — harus didaftarkan manual
      // di sini agar semua fitur utama tersedia saat offline.
      additionalManifestEntries: [
        // Web App Manifest
        { url: "/manifest.json", revision: null },

        // Favicon & Apple Touch Icon
        { url: "/favicon.ico", revision: null },
        { url: "/icons/apple-touch-icon.png", revision: null },

        // Ikon PWA (wajib agar manifest panel DevTools menampilkan ikon)
        { url: "/icons/icon-192x192.png", revision: null },
        { url: "/icons/icon-512x512.png", revision: null },

        // Model TensorFlow.js — kunci agar deteksi berjalan offline
        { url: "/model/model.json", revision: null },
        { url: "/model/metadata.json", revision: null },
        { url: "/model/weights.bin", revision: null },
      ],

      // ─── Runtime Caching ─────────────────────────────────────────────────
      runtimeCaching: [
        // Aset statis lokal (.js, .css, .png, .ico, .json, .bin):
        // Cache First — aset ini tidak berubah antar request, prioritaskan cache.
        {
          urlPattern: /\.(?:js|css|png|ico|json|bin)$/i,
          handler: "CacheFirst",
          options: {
            cacheName: "static-assets-cache",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },

        // Hugging Face CDN — model Transformers.js (flan-t5-small):
        // Cache First — file model besar, tidak perlu re-download setiap sesi.
        // Download pertama saat online, selanjutnya selalu dari cache.
        {
          urlPattern:
            /^https:\/\/(huggingface\.co|cdn-lfs[\w.-]*\.huggingface\.co)\//i,
          handler: "CacheFirst",
          options: {
            cacheName: "hf-model-cache",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },

        // Google Fonts: Cache First — font jarang berubah, simpan lama.
        {
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//i,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-cache",
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 tahun
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },

        // Lucide CDN (unpkg) — ikon UI: Cache First agar tampil saat offline.
        {
          urlPattern: /^https:\/\/unpkg\.com\//i,
          handler: "CacheFirst",
          options: {
            cacheName: "cdn-cache",
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },

        // API eksternal: Network First — utamakan data terbaru,
        // fallback ke cache jika jaringan tidak tersedia.
        {
          urlPattern: /^https:\/\/api\./i,
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    }),
  ],
});
