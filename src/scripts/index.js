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

// Service Worker diregistrasi setelah halaman selesai dimuat.
// sw.js adalah Classic Script (menggunakan importScripts Workbox CDN),
// sehingga tidak ada konflik dengan bundle ESM hasil Webpack.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ Service Worker terdaftar:", registration.scope);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("🔄 Update Service Worker tersedia.");
            }
          });
        });
      })
      .catch((error) => {
        console.error("❌ Registrasi Service Worker gagal:", error);
      });
  });
}
