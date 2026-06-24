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

// sw.js hanya di-generate untuk production build (lihat webpack.prod.js /
// WorkboxWebpackPlugin.GenerateSW), sehingga registrasi dilewati di dev
// agar tidak muncul error 404 di console.
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ Service Worker terdaftar:", registration.scope);

        // Cek update SW saat user kembali ke tab
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
