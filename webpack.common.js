const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    app: path.resolve(__dirname, "src/scripts/index.js"),
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    // Generate real ES module output so import.meta.url works natively
    // in the browser — this prevents Webpack from generating the broken
    // __webpack_module__ polyfill that crashes at runtime.
    module: true,
    chunkFormat: "module",
  },
  experiments: {
    // Required to enable output.module = true
    outputModule: true,
  },
  externals: {
    // @huggingface/transformers pulls in onnxruntime-node as a peer dep;
    // that's a native binary for Node.js and has no place in a browser bundle.
    // Marking it external tells Webpack to skip it entirely.
    "onnxruntime-node": "{}",
  },
  resolve: {
    alias: {
      // Same reason as externals above — belt-and-suspenders.
      "onnxruntime-node": false,
    },
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif)$/i,
        type: "asset/resource",
      },

      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            // modules: false → Babel does not convert import/export to CJS.
            // Webpack handles ES module syntax natively, which is required
            // when outputting real ESM (output.module = true).
            presets: [["@babel/preset-env", { modules: false }]],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
    parser: {
      javascript: {
        importMeta: true,
      },
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "src/index.html"),
      // type="module" is correct here because our output IS real ESM now.
      scriptLoading: "module",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "src/model"),
          to: path.resolve(__dirname, "dist/model"),
        },
        {
          from: path.resolve(__dirname, "src/public"),
          to: path.resolve(__dirname, "dist"),
          globOptions: { ignore: ["**/screenshots/**"] },
          noErrorOnMissing: true,
        },
        // Salin sw.js manual ke root dist/ agar terdaftar di scope "/"
        {
          from: path.resolve(__dirname, "src/sw.js"),
          to: path.resolve(__dirname, "dist/sw.js"),
        },
      ],
    }),
  ],
  stats: {
    warningsFilter: /import\.meta/,
  },
};
