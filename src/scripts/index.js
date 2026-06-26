import "../styles/styles.css";
import App from "./pages/app.js";

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const response = await fetch("/sw.js", {
      method: "HEAD",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.error("Service worker registration skipped:", error);
  }
}

window.addEventListener("load", () => {
  registerServiceWorker();
});

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App({
    container: document.querySelector("#main-content"),
  });

  await app.renderPage();

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
});
