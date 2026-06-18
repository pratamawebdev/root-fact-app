import {
  generateCameraSection,
  generateInfoPanel,
  generateFooter,
} from "../../templates.js";
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
    this.bindEvents();
    await this.#presenter.initialize();
  }

  bindEvents() {
    document.getElementById("btn-toggle")?.addEventListener("click", () => this.#presenter.toggleCamera());

    document.getElementById("fps-slider")?.addEventListener("input", (event) => {
      this.#presenter.setFPS(event.target.value);
    });

    document.getElementById("tone-select")?.addEventListener("change", (event) => {
      this.#presenter.setTone(event.target.value);
    });

    document.getElementById("camera-select")?.addEventListener("change", async () => {
      if (document.getElementById("btn-toggle")?.classList.contains("scanning")) {
        await this.#presenter.toggleCamera();
        await this.#presenter.toggleCamera();
      }
    });

    document.getElementById("btn-copy")?.addEventListener("click", () => this.#presenter.copyCurrentFact());
  }

  getVideoElement() {
    return document.getElementById("media-video");
  }

  getCameraSelect() {
    return document.getElementById("camera-select");
  }

  getSelectedTone() {
    return document.getElementById("tone-select")?.value || "normal";
  }

  getCurrentFactText() {
    return document.getElementById("fun-fact-text")?.textContent?.trim() || "";
  }

  showAppStatus(text, active = false) {
    const statusText = document.getElementById("status-text");
    const statusDot = document.getElementById("status-dot");
    if (statusText) statusText.textContent = text;
    statusDot?.classList.toggle("active", active);
  }

  setCameraActive(active) {
    document.getElementById("camera-placeholder")?.classList.toggle("hidden", active);
    document.getElementById("camera-overlay")?.classList.toggle("active", active);
    document.getElementById("btn-toggle")?.classList.toggle("scanning", active);
  }

  showIdle() {
    this.showState("idle");
  }

  showLoading(message = "Sedang mengidentifikasi sayuran Anda") {
    this.showState("loading");
    const loadingText = document.querySelector("#state-loading p");
    if (loadingText) loadingText.textContent = message;
  }

  showDetectionResult(result) {
    this.showState("result");
    document.getElementById("detected-name").textContent = result.label;
    document.getElementById("detected-confidence").textContent = `${result.confidence}%`;
    document.getElementById("confidence-fill").style.width = `${result.confidence}%`;
  }

  showFactLoading(isLoading) {
    document.getElementById("fun-fact-loading")?.classList.toggle("hidden", !isLoading);
    document.getElementById("fun-fact-content")?.classList.toggle("muted", isLoading);
  }

  showFact(text) {
    const factText = document.getElementById("fun-fact-text");
    if (factText) factText.textContent = text;
  }

  showCopiedState() {
    const button = document.getElementById("btn-copy");
    button?.classList.add("copied");
    setTimeout(() => button?.classList.remove("copied"), 1200);
  }

  updateFPSLabel(fps) {
    const label = document.getElementById("fps-label");
    if (label) label.textContent = `${fps} FPS`;
  }

  showError(message) {
    this.showAppStatus(message, false);
    this.showLoading(message);
  }

  showState(state) {
    document.getElementById("state-idle")?.classList.toggle("hidden", state !== "idle");
    document.getElementById("state-loading")?.classList.toggle("hidden", state !== "loading");
    document.getElementById("state-result")?.classList.toggle("hidden", state !== "result");
  }
}
