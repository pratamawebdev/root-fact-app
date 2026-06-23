import { APP_CONFIG } from "../../config.js";
import { isValidDetection, createDelay, logError } from "../../utils/index.js";

const VIDEO_ID = "media-video";
const CANVAS_ID = "media-canvas";

/**
 * Presenter (MVP) - alur deteksi:
 *   1. User ketuk toggle → kamera hidup, loop mulai
 *   2. Loop dapat deteksi valid (confidence > threshold) →
 *      LANGSUNG stop loop + kamera, tampilkan hasil, generate fun fact
 *   3. User baca hasil → ketuk toggle lagi untuk scan ulang
 *
 * Tidak ada re-konfirmasi kedua — itu penyebab "scan ulang pas gerak dikit".
 */
export default class HomePresenter {
  #view;
  #cameraService;
  #detectionService;
  #rootFactsService;

  #isScanning = false;
  #isBusy = false;
  #loopTimeoutId = null;
  #currentLabel = null;
  #currentTone = "normal";
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
        this.#detectionService.loadModel((f) => this.#reportLoadProgress("vision", f)),
        this.#rootFactsService.loadModel((f) => this.#reportLoadProgress("language", f)),
      ]);
      this.#view.setStatus("Siap digunakan", "active");
      await this.#cameraService.loadCameras(this.#view.getCameraSelectElement());
    } catch (error) {
      logError("HomePresenter.init", error);
      this.#view.setStatus("Gagal memuat model AI", "error");
    }
  }

  #reportLoadProgress(part, fraction) {
    this.#loadProgress[part] = Math.min(Math.max(fraction, 0), 1);
    const pct = Math.round((this.#loadProgress.vision + this.#loadProgress.language) / 2 * 100);
    this.#view.setStatus("Menunggu Model... " + pct + "%", "idle");
  }

  // ── toggle ──────────────────────────────────────────────────────────────
  async handleToggleScan() {
    if (this.#isScanning) {
      this.#stopScan();
    } else {
      await this.#startScan();
    }
  }

  async #startScan() {
    try {
      await this.#cameraService.startCamera(
        VIDEO_ID, CANVAS_ID, this.#view.getCameraSelectElement(),
      );
    } catch (error) {
      logError("HomePresenter.startScan", error);
      this.#view.showCameraError(error.message || "Gagal memulai kamera");
      return;
    }

    this.#isScanning = true;
    this.#isBusy = false;
    this.#currentLabel = null;
    this.#lastFact = "";
    this.#view.setCameraActiveUI(true);
    this.#view.showSearchingState();
    this.#view.setStatus("Mendeteksi...", "active");
    this.#scheduleNextTick();
  }

  /** Stop manual (user tekan tombol saat kamera hidup) → kembali ke idle. */
  #stopScan() {
    this.#isScanning = false;
    this.#isBusy = false;
    if (this.#loopTimeoutId) { clearTimeout(this.#loopTimeoutId); this.#loopTimeoutId = null; }
    this.#cameraService.stopCamera();
    this.#currentLabel = null;
    this.#view.setCameraActiveUI(false);
    this.#view.showIdleState();
    this.#view.setStatus("Siap digunakan", "active");
  }

  /**
   * Stop otomatis setelah deteksi berhasil.
   * Kamera dimatikan SEGERA — hasil + fun fact tetap tampil di panel.
   * Button kembali ke "mulai" sehingga user bisa ketuk untuk scan ulang.
   */
  #stopScanAfterDetection() {
    this.#isScanning = false;
    if (this.#loopTimeoutId) { clearTimeout(this.#loopTimeoutId); this.#loopTimeoutId = null; }
    this.#cameraService.stopCamera();
    this.#view.setCameraActiveUI(false);
    this.#view.setStatus("Ketuk tombol untuk scan ulang", "active");
    // Sengaja TIDAK memanggil showIdleState() — hasil tetap tampil.
  }

  // ── detection loop ───────────────────────────────────────────────────────
  #scheduleNextTick() {
    if (!this.#isScanning) return;
    const interval = Math.max(1000 / this.#cameraService.getFPS(), APP_CONFIG.detectionRetryInterval);
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
        // Deteksi valid → langsung kunci, tidak perlu tick berikutnya.
        await this.#lockInDetection(result);
        return; // <-- loop berhenti di sini
      }

      this.#view.showSearchingState();
    } catch (error) {
      logError("HomePresenter.tick", error);
    }

    this.#scheduleNextTick();
  }

  /**
   * Langkah setelah deteksi valid pertama:
   * 1. Stop kamera DULU (tidak ada window untuk rescan)
   * 2. Tampilkan hasil
   * 3. Generate fun fact
   */
  async #lockInDetection(result) {
    this.#isBusy = true;
    this.#currentLabel = result.label;

    // ★ Matikan kamera & loop SEBELUM async work agar tidak ada
    //   celah bagi tick berikutnya untuk memulai ulang.
    this.#stopScanAfterDetection();

    this.#view.showResultState({ label: result.label, confidence: result.confidence });
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
      this.#view.setFunFactText("Gagal membuat fakta menarik. Coba scan ulang.");
    } finally {
      this.#view.setFunFactLoading(false);
      this.#isBusy = false;
    }
  }

  // ── controls ─────────────────────────────────────────────────────────────
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
