const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

// Service Worker ditangani oleh src/sw.js manual (Workbox CDN) yang disalin
// ke dist/ via CopyWebpackPlugin di webpack.common.js. WorkboxWebpackPlugin
// tidak digunakan karena GenerateSW menghasilkan output CommonJS (importScripts)
// yang tidak kompatibel dengan mode output ESM (output.module: true) yang
// dipakai proyek ini, sehingga SW gagal registrasi diam-diam di browser modern.

module.exports = merge(common, {
  mode: "production",
  devtool: false,

  optimization: {
    concatenateModules: false,
  },

  plugins: [
    new CleanWebpackPlugin(),
  ],
});
