const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const webpack = require("webpack");

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

      exclude: [/^_redirects$/],

      // ─── Runtime Caching ─────────────────────────────────────────────────
      runtimeCaching: [
        {
          urlPattern: ({ url }) =>
            url.origin === self.location.origin &&
            /\.(?:js|css|png|ico|json|bin|woff2?|ttf|svg)$/i.test(url.pathname),
          handler: "StaleWhileRevalidate",
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
