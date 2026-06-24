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
      // weights.bin ~2.1 MB, naikkan batas agar semua aset masuk precache.
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB

      cleanupOutdatedCaches: true,

      // ─── Precache aset statis yang disalin CopyWebpackPlugin ─────────────
      // GenerateSW hanya mendeteksi file yang dihasilkan Webpack secara
      // langsung. File yang disalin via CopyWebpackPlugin (model, ikon,
      // manifest) harus didaftarkan manual di sini agar tersedia offline.
      additionalManifestEntries: [
        // Web App Manifest
        { url: "/manifest.json", revision: null },

        // Favicon & Apple Touch Icon
        { url: "/favicon.ico", revision: null },
        { url: "/icons/apple-touch-icon.png", revision: null },

        // Ikon PWA
        { url: "/icons/icon-192x192.png", revision: null },
        { url: "/icons/icon-512x512.png", revision: null },

        // Model TensorFlow.js (Teachable Machine)
        { url: "/model/model.json", revision: null },
        { url: "/model/metadata.json", revision: null },
        { url: "/model/weights.bin", revision: null },
      ],

      // ─── Runtime Caching ─────────────────────────────────────────────────
      runtimeCaching: [
        // Aset statis lokal: Cache First
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

        // Hugging Face CDN — model Transformers.js: Cache First
        // Model ini diunduh pertama kali saat online, lalu tersedia offline.
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

        // Google Fonts: Cache First (jarang berubah)
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

        // Lucide icons CDN (unpkg): Cache First
        {
          urlPattern: /^https:\/\/unpkg\.com\//i,
          handler: "CacheFirst",
          options: {
            cacheName: "cdn-cache",
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },

        // API eksternal: Network First (utamakan data terbaru, fallback cache)
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
