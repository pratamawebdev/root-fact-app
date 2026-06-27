import { APP_CONFIG } from "../../config.js";
import { isValidDetection, createDelay, logError } from "../../utils/index.js";

const VIDEO_ID = "media-video";
const CANVAS_ID = "media-canvas";

/**
 * Alur scan:
 * 1. User klik tombol scan
 * 2. Kamera hidup → tunggu warm-up delay agar sensor stabil
 * 3. Deteksi loop berjalan; tiap inferensi diselingi settle delay
 * 4. Jika hasil valid, label dikunci
 * 5. Loop berhenti, kamera dimatikan
 * 6. Hasil + fun fact tampil
 * 7. Scan ulang hanya jika user klik tombol lagi
 *
 * Reset state (label, fakta, TF.js memory) dilakukan di awal setiap scan
 * agar percobaan kedua dan seterusnya dimulai dari kondisi bersih.
 */
export default class HomePresenter {
  #view;
  #cameraService;
  #detectionService;
  #rootFactsService;

  #isScanning = false;
  #isBusy = false;
  #loopTimeoutId = null;

  // Flag: true selama periode warm-up setelah kamera menyala.
  // Inferensi tidak boleh berjalan sebelum warm-up selesai.
  #isWarmingUp = false;

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
    // ── Reset memory dari sesi sebelumnya ────────────────────────────────
    // Bersihkan tensor TF.js yang tersisa dan reset statistik performa
    // agar percobaan kedua+ dimulai dari kondisi benar-benar bersih.
    this.#detectionService.reset();
    this.#currentLabel = "";
    this.#lastFact = "";

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
    this.#isWarmingUp = true;

    this.#view.setCameraActiveUI(true);
    this.#view.showSearchingState();
    this.#view.setStatus("Menyiapkan kamera...", "idle");

    // ── Warm-up delay ─────────────────────────────────────────────────────
    // Beri waktu sensor kamera untuk menstabilkan eksposur & white balance.
    // Tanpa delay ini, frame pertama sering hitam atau gelap sehingga
    // model akan salah mengklasifikasi (terutama di scan kedua+).
    await createDelay(APP_CONFIG.cameraWarmupDelay);

    if (!this.#isScanning) return; // user bisa membatalkan selama warmup

    this.#isWarmingUp = false;
    this.#view.setStatus("Mendeteksi...", "active");
    this.#scheduleNextTick();
  }

  #stopScanManually() {
    this.#isScanning = false;
    this.#isBusy = false;
    this.#isWarmingUp = false;

    if (this.#loopTimeoutId) {
      clearTimeout(this.#loopTimeoutId);
      this.#loopTimeoutId = null;
    }

    this.#cameraService.stopCamera();

    // Bersihkan state dan memory saat user menghentikan scan secara manual
    this.#detectionService.reset();
    this.#currentLabel = "";
    this.#lastFact = "";

    this.#view.setCameraActiveUI(false);
    this.#view.showIdleState();
    this.#view.setStatus("Siap digunakan", "active");
  }

  #stopScanAfterDetection() {
    this.#isScanning = false;
    this.#isWarmingUp = false;

    if (this.#loopTimeoutId) {
      clearTimeout(this.#loopTimeoutId);
      this.#loopTimeoutId = null;
    }

    this.#cameraService.stopCamera();

    this.#view.setCameraActiveUI(false);
    this.#view.setStatus("Ketuk tombol untuk scan ulang", "active");
  }

  #scheduleNextTick() {
    if (!this.#isScanning || this.#isWarmingUp) return;

    // Hitung interval: gunakan nilai terbesar antara target FPS interval
    // dan inferenceSettleDelay untuk memastikan frame benar-benar stabil
    // sebelum inferensi berikutnya dijalankan.
    const fpsInterval = Math.round(1000 / this.#cameraService.getFPS());
    const interval = Math.max(
      fpsInterval,
      APP_CONFIG.detectionRetryInterval,
      APP_CONFIG.inferenceSettleDelay,
    );

    this.#loopTimeoutId = setTimeout(() => this.#tick(), interval);
  }

  async #tick() {
    if (!this.#isScanning || this.#isBusy || this.#isWarmingUp) {
      this.#scheduleNextTick();
      return;
    }

    const video = this.#view.getVideoElement();

    // Pastikan video benar-benar siap: readyState 4 (HAVE_ENOUGH_DATA)
    // jauh lebih aman daripada readyState 2 untuk inferensi — frame sudah
    // stabil dan tidak berisi data parsial.
    if (!video || video.readyState < 4) {
      this.#scheduleNextTick();
      return;
    }

    // Tambahan guard: skip jika video masih paused atau ukurannya belum ada
    if (video.paused || video.videoWidth === 0 || video.videoHeight === 0) {
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
