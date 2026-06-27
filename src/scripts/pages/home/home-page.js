import { generateCameraSection, generateInfoPanel, generateFooter } from "../../templates.js";
import HomePresenter from "./home-presenter.js";
import CameraService from "../../services/camera.service.js";
import DetectionService from "../../services/detection.service.js";
import RootFactsService from "../../services/rootfacts.service.js";
import { UI_CONFIG } from "../../config.js";
import {
  hideElement,
  showElement,
  setElementText,
  setElementHTML,
  setElementOpacity,
  addFadeInAnimation,
  getConfidenceCardClass,
} from "../../utils/index.js";

/**
 * View (MVP): renders markup, exposes a small DOM-update API for the
 * presenter to call, and forwards user interaction straight to it.
 */
export default class HomePage {
  #presenter = null;
  #elements = {};

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
    this.#queryElements();
    this.#bindEvents();

    this.#presenter = new HomePresenter({
      view: this,
      cameraService: new CameraService(),
      detectionService: new DetectionService(),
      rootFactsService: new RootFactsService(),
    });

    await this.#presenter.init();
  }

  #queryElements() {
    this.#elements = {
      video: document.getElementById("media-video"),
      canvas: document.getElementById("media-canvas"),
      cameraOverlay: document.getElementById("camera-overlay"),
      cameraPlaceholder: document.getElementById("camera-placeholder"),
      btnToggle: document.getElementById("btn-toggle"),
      cameraSelect: document.getElementById("camera-select"),
      fpsSlider: document.getElementById("fps-slider"),
      fpsLabel: document.getElementById("fps-label"),
      toneSelect: document.getElementById("tone-select"),

      statusDot: document.getElementById("status-dot"),
      statusText: document.getElementById("status-text"),

      stateIdle: document.getElementById("state-idle"),
      stateLoading: document.getElementById("state-loading"),
      stateResult: document.getElementById("state-result"),

      detectedName: document.getElementById("detected-name"),
      detectedConfidence: document.getElementById("detected-confidence"),
      confidenceFill: document.getElementById("confidence-fill"),

      funFactLoading: document.getElementById("fun-fact-loading"),
      funFactContent: document.getElementById("fun-fact-content"),
      funFactText: document.getElementById("fun-fact-text"),
      btnCopy: document.getElementById("btn-copy"),
    };
  }

  #bindEvents() {
    const { btnToggle, cameraSelect, fpsSlider, toneSelect, btnCopy } = this.#elements;

    btnToggle?.addEventListener("click", () => this.#presenter?.handleToggleScan());

    cameraSelect?.addEventListener("change", () => this.#presenter?.handleCameraChange());

    fpsSlider?.addEventListener("input", (event) =>
      this.#presenter?.handleFPSChange(Number(event.target.value)),
    );

    toneSelect?.addEventListener("change", (event) =>
      this.#presenter?.handleToneChange(event.target.value),
    );

    btnCopy?.addEventListener("click", () => this.#presenter?.handleCopyFact());
  }

  // ---------------------------------------------------------------------
  // View API consumed by HomePresenter. Keeping every DOM read/write here
  // means the presenter (and the services it drives) stay framework- and
  // markup-agnostic.
  // ---------------------------------------------------------------------

  getVideoElement() {
    return this.#elements.video;
  }

  getCameraSelectElement() {
    return this.#elements.cameraSelect;
  }

  setStatus(text, variant = "idle") {
    const { statusDot, statusText } = this.#elements;
    setElementText(statusText, text);
    if (statusDot) {
      statusDot.classList.remove("active", "error");
      if (variant === "active") statusDot.classList.add("active");
      if (variant === "error") statusDot.classList.add("error");
    }
  }

  setCameraActiveUI(isActive) {
    const { cameraOverlay, cameraPlaceholder, btnToggle } = this.#elements;
    if (isActive) {
      cameraOverlay?.classList.add("active");
      hideElement(cameraPlaceholder);
      btnToggle?.classList.add("scanning");
    } else {
      cameraOverlay?.classList.remove("active");
      showElement(cameraPlaceholder);
      btnToggle?.classList.remove("scanning");
    }
  }

  setFPSLabel(fps) {
    setElementText(this.#elements.fpsLabel, `${fps} FPS`);
  }

  showIdleState() {
    showElement(this.#elements.stateIdle);
    hideElement(this.#elements.stateLoading);
    hideElement(this.#elements.stateResult);
  }

  showSearchingState() {
    hideElement(this.#elements.stateIdle);
    showElement(this.#elements.stateLoading);
    hideElement(this.#elements.stateResult);
  }

  showResultState({ label, confidence }) {
    const { stateIdle, stateLoading, stateResult } = this.#elements;

    hideElement(stateIdle);
    hideElement(stateLoading);
    showElement(stateResult);

    setElementText(this.#elements.detectedName, label);
    this.updateConfidence(confidence);
    addFadeInAnimation(stateResult);
  }

  updateConfidence(confidence) {
    const { detectedConfidence, confidenceFill } = this.#elements;
    setElementText(detectedConfidence, `${confidence}%`);

    if (confidenceFill) {
      confidenceFill.style.width = `${confidence}%`;
      confidenceFill.classList.remove("theme-green", "theme-yellow", "theme-red");
      confidenceFill.classList.add(getConfidenceCardClass(confidence));
    }
  }

  setFunFactLoading(isLoading) {
    const { funFactLoading, funFactContent } = this.#elements;
    if (isLoading) {
      showElement(funFactLoading);
      setElementOpacity(funFactContent, UI_CONFIG.factsCardOpacity.loading);
    } else {
      hideElement(funFactLoading);
      setElementOpacity(funFactContent, UI_CONFIG.factsCardOpacity.normal);
    }
  }

  setFunFactText(text) {
    setElementText(this.#elements.funFactText, text);
    addFadeInAnimation(this.#elements.funFactText);
  }

  flashCopyButton() {
    const { btnCopy } = this.#elements;
    if (!btnCopy) return;

    const original = btnCopy.innerHTML;
    setElementHTML(btnCopy, '<i data-lucide="check" width="18" height="18"></i>');
    if (typeof lucide !== "undefined") lucide.createIcons();

    setTimeout(() => {
      setElementHTML(btnCopy, original);
      if (typeof lucide !== "undefined") lucide.createIcons();
    }, UI_CONFIG.animationDuration * 2);
  }

  showCameraError(message) {
    this.setStatus(message, "error");
    this.setCameraActiveUI(false);
    this.showIdleState();
  }
}
