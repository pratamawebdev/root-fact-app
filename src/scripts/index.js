import "../styles/styles.css";
import App from "./pages/app.js";

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App({
    container: document.querySelector("#main-content"),
  });

  await app.renderPage();

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
});

// sw.js is only generated for production builds (see webpack.prod.js /
// WorkboxWebpackPlugin.GenerateSW), so registration is skipped in dev to
// avoid a noisy 404 in the console.
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("❌ Service worker registration failed:", error);
    });
  });
}
