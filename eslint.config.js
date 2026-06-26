module.exports = [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        alert: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        document: "readonly",
        fetch: "readonly",
        HTMLMediaElement: "readonly",
        importScripts: "readonly",
        lucide: "readonly",
        navigator: "readonly",
        performance: "readonly",
        self: "readonly",
        setTimeout: "readonly",
        window: "readonly",
        workbox: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      eqeqeq: ["error", "always"],
    },
  },
];
