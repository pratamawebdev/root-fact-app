import CameraService from "../../services/camera.service.js";
import DetectionService from "../../services/detection.service.js";
import RootFactsService from "../../services/rootfacts.service.js";
import { APP_CONFIG } from "../../config.js";

class HomePresenter {
  constructor({ view }) {
    this.view = view;
    this.cameraService = new CameraService();
    this.detectionService = new DetectionService();
    this.rootFactsService = new RootFactsService();
    this.isScanning = false;
    this.detectionTimer = null;
    this.lastDetectedLabel = "";
    this.lastGeneratedAt = 0;
    this.fps = 30;
  }

  async initialize() {
    this.view.showAppStatus("Menunggu model... 0%", false);

    try {
      const detectionInfo = await this.detectionService.loadModel((progress) => {
        this.view.showAppStatus(`Menunggu model... ${progress}%`, false);
      });

      this.view.showAppStatus(`Model siap (${detectionInfo.backend.toUpperCase()})`, true);

      this.rootFactsService.loadModel().then((info) => {
        this.view.showAppStatus(`AI siap (${info.backend.toUpperCase()})`, true);
      }).catch(() => {
        this.view.showAppStatus("Deteksi siap, AI fallback aktif", true);
      });
    } catch (error) {
      this.view.showError(`Model gagal dimuat: ${error.message}`);
      this.view.showAppStatus("Model gagal", false);
    }
  }

  setFPS(fps) {
    this.fps = Number(fps) || 30;
    this.cameraService.setFPS(this.fps);
    this.view.updateFPSLabel(this.fps);

    if (this.isScanning) {
      this.stopDetectionLoop();
      this.startDetectionLoop();
    }
  }

  setTone(tone) {
    this.rootFactsService.setTone(tone);
  }

  async toggleCamera() {
    if (this.cameraService.isActive()) {
      this.stopCamera();
      return;
    }

    try {
      await this.cameraService.startCamera("media-video", "media-canvas", this.view.getCameraSelect());
      this.cameraService.setFPS(this.fps);
      this.view.setCameraActive(true);
      this.startDetectionLoop();
    } catch (error) {
      this.view.showError(error.message || "Gagal membuka kamera.");
      this.view.setCameraActive(false);
    }
  }

  stopCamera() {
    this.stopDetectionLoop();
    this.cameraService.stopCamera();
    this.view.setCameraActive(false);
    this.view.showIdle();
    this.lastDetectedLabel = "";
  }

  startDetectionLoop() {
    this.isScanning = true;
    const interval = Math.max(1000 / this.fps, 100);

    const scan = async () => {
      if (!this.isScanning || !this.cameraService.isActive()) return;

      await this.scanFrame();
      this.detectionTimer = window.setTimeout(scan, interval);
    };

    scan();
  }

  stopDetectionLoop() {
    this.isScanning = false;
    if (this.detectionTimer) {
      window.clearTimeout(this.detectionTimer);
      this.detectionTimer = null;
    }
  }

  async scanFrame() {
    const video = this.view.getVideoElement();
    if (!video || video.readyState < 2) return;

    try {
      const result = await this.detectionService.predict(video);
      if (!result.isValid) {
        this.view.showLoading(`Mencari sayuran... ${result.label} (${result.confidence}%)`);
        return;
      }

      this.view.showDetectionResult(result);

      const now = Date.now();
      const shouldGenerate = result.label !== this.lastDetectedLabel || now - this.lastGeneratedAt > 10000;

      if (shouldGenerate) {
        this.lastDetectedLabel = result.label;
        this.lastGeneratedAt = now;
        await this.generateFact(result.label);
      }
    } catch (error) {
      this.view.showError(error.message || "Prediksi gagal.");
    }
  }

  async generateFact(label) {
    this.view.showFactLoading(true);
    const tone = this.view.getSelectedTone();
    const fact = await this.rootFactsService.generateFacts(label, tone);
    this.view.showFact(fact);
    this.view.showFactLoading(false);
  }

  async copyCurrentFact() {
    const text = this.view.getCurrentFactText();
    if (!text) return;

    await navigator.clipboard.writeText(text);
    this.view.showCopiedState();
  }
}

export default HomePresenter;
