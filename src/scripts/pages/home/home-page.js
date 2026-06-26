import {
  generateCameraSection,
  generateInfoPanel,
  generateFooter,
} from "../../templates.js";
import {
  addFadeInAnimation,
  hideElement,
  setElementStyle,
  setElementText,
  showElement,
} from "../../utils/index.js";
import HomePresenter from "./home-presenter.js";

export default class HomePage {
  #presenter = null;

  async render() {
    return `
      <main class="main-content">
        ${generateCameraSection()}
        ${generateInfoPanel()}
      </main>
      ${generateFooter()}
    `;
  }

  async afterRender() {
    this.#presenter = new HomePresenter({ view: this });
    this.#bindEvents();
    await this.#presenter.initialApp();
  }

  #bindEvents() {
    const toggleButton = document.getElementById("btn-toggle");
    const fpsSlider = document.getElementById("fps-slider");
    const cameraSelect = document.getElementById("camera-select");
    const toneSelect = document.getElementById("tone-select");
    const copyButton = document.getElementById("btn-copy");

    if (toggleButton) {
      toggleButton.addEventListener("click", () => {
        this.#presenter.toggleCamera();
      });
    }

    if (fpsSlider) {
      fpsSlider.addEventListener("input", (event) => {
        const fps = Number(event.target.value);
        this.updateFPSLabel(fps);
        this.#presenter.setFPS(fps);
      });
    }

    if (cameraSelect) {
      cameraSelect.addEventListener("change", async () => {
        await this.#presenter.changeCamera();
      });
    }

    if (toneSelect) {
      toneSelect.addEventListener("change", async (event) => {
        await this.#presenter.setTone(event.target.value);
      });
    }

    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        await this.#presenter.copyFact();
      });
    }

    window.addEventListener("beforeunload", () => {
      this.#presenter.stopCamera();
    });
  }

  showInitialLoading() {
    this.showCameraLoading();
    this.showLoadingState("Menunggu Model... 0%", "Memuat Model Deteksi...");
    this.showStatus("Menunggu Model... 0%");
  }

  showModelLoading(progress, message) {
    this.showLoadingState(message, "Memuat Model Deteksi...");
    this.showStatus(message);

    const loadingDescription = document.getElementById("loading-description");
    if (loadingDescription && typeof progress === "number") {
      loadingDescription.textContent = `${message}`;
    }
  }

  showModelReady(detectionBackend, factsBackend) {
    this.hideCameraLoading();
    detectionBackend = detectionBackend.toUpperCase();
    factsBackend = factsBackend.toUpperCase();
    this.showStatus(
      `Model siap. Using ${detectionBackend} and ${factsBackend}.`,
    );
  }

  showCameraLoading() {
    const toggleButton = document.getElementById("btn-toggle");

    if (toggleButton) {
      toggleButton.disabled = true;
    }
  }

  hideCameraLoading() {
    const toggleButton = document.getElementById("btn-toggle");

    if (toggleButton) {
      toggleButton.disabled = false;
    }
  }

  enableToggleButton() {
    this.hideCameraLoading();
  }

  showCameraActive() {
    const toggleButton = document.getElementById("btn-toggle");
    const cameraOverlay = document.getElementById("camera-overlay");
    const cameraPlaceholder = document.getElementById("camera-placeholder");
    const statusDot = document.getElementById("status-dot");

    toggleButton?.classList.add("scanning");
    cameraOverlay?.classList.add("active");
    hideElement(cameraPlaceholder);
    statusDot?.classList.add("active");
  }

  showCameraInactive() {
    const toggleButton = document.getElementById("btn-toggle");
    const cameraOverlay = document.getElementById("camera-overlay");
    const cameraPlaceholder = document.getElementById("camera-placeholder");
    const statusDot = document.getElementById("status-dot");

    toggleButton?.classList.remove("scanning");
    cameraOverlay?.classList.remove("active");
    showElement(cameraPlaceholder);
    statusDot?.classList.remove("active");
  }

  showIdleState() {
    const idleState = document.getElementById("state-idle");
    const loadingState = document.getElementById("state-loading");
    const resultState = document.getElementById("state-result");

    showElement(idleState);
    hideElement(loadingState);
    hideElement(resultState);
  }

  showLoadingState(description, title = "Mencari...") {
    const idleState = document.getElementById("state-idle");
    const loadingState = document.getElementById("state-loading");
    const resultState = document.getElementById("state-result");
    const loadingTitle = document.getElementById("loading-title");
    const loadingDescription = document.getElementById("loading-description");

    hideElement(idleState);
    showElement(loadingState);
    hideElement(resultState);

    setElementText(loadingTitle, title);
    setElementText(loadingDescription, description);
  }

  showScanningHint(prediction) {
    this.showLoadingState(
      `Kandidat teratas: ${prediction.className} (${prediction.confidence}%).`,
      "Mencari Sayuran...",
    );
  }

  showResultState(result) {
    const idleState = document.getElementById("state-idle");
    const loadingState = document.getElementById("state-loading");
    const resultState = document.getElementById("state-result");
    const detectedName = document.getElementById("detected-name");
    const detectedConfidence = document.getElementById("detected-confidence");
    const confidenceFill = document.getElementById("confidence-fill");
    const funFactText = document.getElementById("fun-fact-text");
    const funFactLoading = document.getElementById("fun-fact-loading");
    const funFactContent = document.getElementById("fun-fact-content");
    const copyButton = document.getElementById("btn-copy");

    hideElement(idleState);
    hideElement(loadingState);
    showElement(resultState);
    addFadeInAnimation(resultState);

    setElementText(detectedName, result.className);
    setElementText(detectedConfidence, `${result.confidence}%`);
    setElementStyle(confidenceFill, "width", `${result.confidence}%`);
    setElementText(funFactText, "");
    copyButton?.classList.remove("copied");
    copyButton?.setAttribute("title", "Salin fakta");
    copyButton?.removeAttribute("disabled");

    hideElement(funFactLoading);
    showElement(funFactContent);
  }

  showFactLoading(tone) {
    const funFactText = document.getElementById("fun-fact-text");
    const funFactLoading = document.getElementById("fun-fact-loading");
    const funFactContent = document.getElementById("fun-fact-content");
    const copyButton = document.getElementById("btn-copy");

    setElementText(
      funFactText,
      `Menyiapkan fakta dengan gaya ${this.getToneLabel(tone)}...`,
    );
    showElement(funFactLoading);
    showElement(funFactContent);
    copyButton?.setAttribute("disabled", "disabled");
    copyButton?.classList.remove("copied");
  }

  showFactSuccess(fact) {
    const funFactText = document.getElementById("fun-fact-text");
    const funFactLoading = document.getElementById("fun-fact-loading");
    const copyButton = document.getElementById("btn-copy");

    hideElement(funFactLoading);
    setElementText(funFactText, fact);
    copyButton?.removeAttribute("disabled");
  }

  showFactError(message) {
    const funFactText = document.getElementById("fun-fact-text");
    const funFactLoading = document.getElementById("fun-fact-loading");
    const copyButton = document.getElementById("btn-copy");

    hideElement(funFactLoading);
    setElementText(
      funFactText,
      message || "Fakta tidak dapat dibuat untuk saat ini.",
    );
    copyButton?.setAttribute("disabled", "disabled");
  }

  showCopySuccess() {
    const copyButton = document.getElementById("btn-copy");

    copyButton?.classList.add("copied");
    copyButton?.setAttribute("title", "Tersalin");

    window.setTimeout(() => {
      copyButton?.classList.remove("copied");
      copyButton?.setAttribute("title", "Salin fakta");
    }, 1200);
  }

  showStatus(message) {
    const statusText = document.getElementById("status-text");
    setElementText(statusText, message);
  }

  showError(message) {
    this.showCameraInactive();
    this.hideCameraLoading();
    this.showStatus(message);
    alert(message);
  }

  updateFPSLabel(fps) {
    const fpsLabel = document.getElementById("fps-label");
    setElementText(fpsLabel, `${fps} FPS`);
  }

  getCameraSelectElement() {
    return document.getElementById("camera-select");
  }

  getFPSValue() {
    const fpsSlider = document.getElementById("fps-slider");
    return Number(fpsSlider?.value || 30);
  }

  getSelectedTone() {
    const toneSelect = document.getElementById("tone-select");
    return toneSelect?.value || "normal";
  }

  getToneLabel(tone) {
    const toneLabels = {
      normal: "normal",
      funny: "lucu",
      professional: "profesional",
      casual: "santai",
    };

    return toneLabels[tone] || toneLabels.normal;
  }

  getCurrentFact() {
    const funFactText = document.getElementById("fun-fact-text");
    return funFactText?.textContent?.trim() || "";
  }
}
