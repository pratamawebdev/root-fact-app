import "../styles/styles.css";
import App from "./pages/app.js";

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("/sw.js");
    console.info("Service worker registered.");
  } catch (error) {
    console.warn("Service worker registration failed.", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App({
    container: document.querySelector("#main-content"),
  });

  await app.renderPage();
  await registerServiceWorker();

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
});
