const path = require("path");
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { InjectManifest } = require("workbox-webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  devtool: false,

  optimization: {
    concatenateModules: false,
  },

  plugins: [
    new CleanWebpackPlugin(),

    /**
     * InjectManifest — berbeda dari GenerateSW:
     *  - Menggunakan src/sw.js sebagai template (kita tulis sendiri)
     *  - Me-bundle import Workbox lokal ke dalam sw.js (tidak perlu CDN)
     *  - Mengganti self.__WB_MANIFEST dengan daftar precache otomatis
     *
     * Ini solusi yang benar karena sw.js yang dihasilkan berfungsi
     * penuh OFFLINE — tidak ada dependency ke CDN apapun.
     */
    new InjectManifest({
      // Template sw.js yang berisi logika caching kita
      swSrc: path.resolve(__dirname, "src/sw.js"),

      // Output sw.js ke root dist/
      swDest: "sw.js",

      // Naikkan batas ukuran agar weights.bin (~2.1 MB) masuk precache
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB

      // File yang disalin CopyWebpackPlugin (model, ikon, manifest)
      // tidak otomatis terdeteksi Webpack → daftarkan manual di sini.
      // Workbox akan menyertakannya dalam self.__WB_MANIFEST.
      additionalManifestEntries: [
        // Halaman utama
        { url: "/index.html", revision: "1" },

        // Web App Manifest & ikon
        { url: "/manifest.json", revision: "1" },
        { url: "/favicon.ico", revision: "1" },
        { url: "/icons/icon-192x192.png", revision: "1" },
        { url: "/icons/icon-512x512.png", revision: "1" },
        { url: "/icons/apple-touch-icon.png", revision: "1" },

        // Model TensorFlow.js — wajib agar deteksi berjalan offline
        { url: "/model/model.json", revision: "1" },
        { url: "/model/metadata.json", revision: "1" },
        { url: "/model/weights.bin", revision: "1" },
      ],
    }),
  ],
});
