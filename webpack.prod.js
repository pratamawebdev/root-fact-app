const path = require("path");
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { InjectManifest } = require("workbox-webpack-plugin");
const packageJson = require("./package.json");

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
      maximumFileSizeToCacheInBytes: 35 * 1024 * 1024, // 35 MB, agar file WASM onnxruntime masuk precache

      // Ambil hanya tipe file yang dibutuhkan untuk offline.
      // File .LICENSE.txt dan _redirects tidak perlu dicache.
      include: [
        /\.html$/,
        /\.js$/,
        /\.mjs$/,
        /\.wasm$/,
        /\.css$/,
        /\.json$/,
        /\.png$/,
        /\.ico$/,
        /\.bin$/,
      ],
      exclude: [/\.LICENSE\.txt$/, /^_redirects$/],

      // sw.js tidak otomatis masuk manifest karena file ini dibuat oleh
      // InjectManifest sendiri. Tambahkan manual supaya pengecekan cache
      // tidak lagi menemukan sw.js sebagai berkas yang gagal dicache.
      additionalManifestEntries: [
        { url: "/", revision: packageJson.version },
        { url: "/sw.js", revision: packageJson.version },
      ],
    }),
  ],
});
