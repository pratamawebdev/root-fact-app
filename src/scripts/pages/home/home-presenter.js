import { APP_CONFIG } from "../../config.js";
import { isValidDetection, createDelay, logError } from "../../utils/index.js";

const VIDEO_ID = "media-video";
const CANVAS_ID = "media-canvas";

/**
 * Alur scan:
 * 1. User klik tombol scan
 * 2. Kamera hidup dan mulai deteksi
 * 3. Jika hasil valid, label langsung dikunci
 * 4. Loop deteksi berhenti
 * 5. Kamera dimatikan
 * 6. Hasil + fun fact tetap tampil
 * 7. Scan ulang hanya jika user klik tombol lagi
 */
export default class HomePresenter {
  #view;
  #cameraService;
  #detectionService;
  #rootFactsService;

  #isScanning = false;
  #isBusy = false;
  #loopTimeoutId = null;

  #currentTone = "normal";
  #currentLabel = "";
  #lastFact = "";
  #loadProgress = { vision: 0, language: 0 };

  constructor({ view, cameraService, detectionService, rootFactsService }) {
    this.#view = view;
    this.#cameraService = cameraService;
    this.#detectionService = detectionService;
    this.#rootFactsService = rootFactsService;
  }

  async init() {
    this.#view.showIdleState();
    this.#reportLoadProgress("vision", 0);

    try {
      await Promise.all([
        this.#detectionService.loadModel((fraction) =>
          this.#reportLoadProgress("vision", fraction),
        ),
        this.#rootFactsService.loadModel((fraction) =>
          this.#reportLoadProgress("language", fraction),
        ),
      ]);

      this.#view.setStatus("Siap digunakan", "active");
      await this.#cameraService.loadCameras(
        this.#view.getCameraSelectElement(),
      );
    } catch (error) {
      logError("HomePresenter.init", error);
      this.#view.setStatus("Gagal memuat model AI", "error");
    }
  }

  #reportLoadProgress(part, fraction) {
    this.#loadProgress[part] = Math.min(Math.max(fraction, 0), 1);

    const percent = Math.round(
      ((this.#loadProgress.vision + this.#loadProgress.language) / 2) * 100,
    );

    this.#view.setStatus(`Menunggu Model... ${percent}%`, "idle");
  }

  async handleToggleScan() {
    if (this.#isScanning) {
      this.#stopScanManually();
      return;
    }

    await this.#startScan();
  }

  async #startScan() {
    try {
      await this.#cameraService.startCamera(
        VIDEO_ID,
        CANVAS_ID,
        this.#view.getCameraSelectElement(),
      );
    } catch (error) {
      logError("HomePresenter.startScan", error);
      this.#view.showCameraError(error.message || "Gagal memulai kamera");
      return;
    }

    this.#isScanning = true;
    this.#isBusy = false;
    this.#currentLabel = "";
    this.#lastFact = "";

    this.#view.setCameraActiveUI(true);
    this.#view.showSearchingState();
    this.#view.setStatus("Mendeteksi...", "active");

    this.#scheduleNextTick();
  }

  #stopScanManually() {
    this.#isScanning = false;
    this.#isBusy = false;

    if (this.#loopTimeoutId) {
      clearTimeout(this.#loopTimeoutId);
      this.#loopTimeoutId = null;
    }

    this.#cameraService.stopCamera();

    this.#currentLabel = "";
    this.#lastFact = "";

    this.#view.setCameraActiveUI(false);
    this.#view.showIdleState();
    this.#view.setStatus("Siap digunakan", "active");
  }

  #stopScanAfterDetection() {
    this.#isScanning = false;

    if (this.#loopTimeoutId) {
      clearTimeout(this.#loopTimeoutId);
      this.#loopTimeoutId = null;
    }

    this.#cameraService.stopCamera();

    this.#view.setCameraActiveUI(false);
    this.#view.setStatus("Ketuk tombol untuk scan ulang", "active");
  }

  #scheduleNextTick() {
    if (!this.#isScanning) return;

    const interval = Math.max(
      1000 / this.#cameraService.getFPS(),
      APP_CONFIG.detectionRetryInterval,
    );

    this.#loopTimeoutId = setTimeout(() => this.#tick(), interval);
  }

  async #tick() {
    if (!this.#isScanning || this.#isBusy) {
      this.#scheduleNextTick();
      return;
    }

    const video = this.#view.getVideoElement();

    if (!video || video.readyState < 2) {
      this.#scheduleNextTick();
      return;
    }

    try {
      const result = await this.#detectionService.predict(video);

      if (isValidDetection(result)) {
        await this.#lockInDetection(result);
        return;
      }

      this.#view.showSearchingState();
      this.#view.setStatus("Mendeteksi...", "active");
    } catch (error) {
      logError("HomePresenter.tick", error);
    }

    this.#scheduleNextTick();
  }

  async #lockInDetection(result) {
    this.#isBusy = true;
    this.#currentLabel = result.label;

    this.#stopScanAfterDetection();

    this.#view.showResultState({
      label: result.label,
      confidence: result.confidence,
    });

    this.#view.setFunFactLoading(true);

    try {
      const [factText] = await Promise.all([
        this.#rootFactsService.generateFacts(result.label, this.#currentTone),
        createDelay(APP_CONFIG.factsGenerationDelay),
      ]);

      this.#lastFact = factText || "Fakta menarik tidak tersedia saat ini.";
      this.#view.setFunFactText(this.#lastFact);
    } catch (error) {
      logError("HomePresenter.lockInDetection", error);

      this.#lastFact = "";
      this.#view.setFunFactText(
        "Gagal membuat fakta menarik. Coba scan ulang.",
      );
    } finally {
      this.#view.setFunFactLoading(false);
      this.#isBusy = false;
    }
  }

  handleCameraChange() {
    if (!this.#isScanning) return;

    this.#cameraService
      .startCamera(VIDEO_ID, CANVAS_ID, this.#view.getCameraSelectElement())
      .catch((error) => {
        logError("HomePresenter.handleCameraChange", error);
        this.#view.showCameraError(error.message || "Gagal mengganti kamera");
      });
  }

  handleFPSChange(fps) {
    const applied = this.#cameraService.setFPS(fps);
    this.#view.setFPSLabel(applied);
  }

  handleToneChange(tone) {
    this.#currentTone = this.#rootFactsService.setTone(tone);
  }

  async handleCopyFact() {
    if (!this.#lastFact) return;

    try {
      await navigator.clipboard.writeText(this.#lastFact);
      this.#view.flashCopyButton();
    } catch (error) {
      logError("HomePresenter.handleCopyFact", error);
    }
  }
}
