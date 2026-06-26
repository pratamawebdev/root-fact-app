import {
  getCameraConfig,
  getCameraConstraints,
  getCameraErrorMessage,
  logError,
} from "../utils/index.js";

class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = getCameraConfig();
  }

  // TODO [Basic] inisiasi elemen video dan canvas
  initializeElements(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);
  }

  // TODO [Basic] Tambahkan konfigurasi kamera untuk mendapatkan daftar perangkat input video
  // TODO [Basic] Dapatkan constraints kamera berdasarkan konfigurasi dan kamera yang dipilih
  async loadCameras(cameraSelect) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser ini tidak mendukung akses kamera.");
    }

    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");

      tempStream.getTracks().forEach((track) => track.stop());

      if (cameraSelect) {
        cameraSelect.innerHTML = "";

        cameras.forEach((camera, index) => {
          const option = document.createElement("option");
          option.value = camera.deviceId;
          option.textContent = camera.label || `Kamera ${index + 1}`;
          cameraSelect.appendChild(option);
        });
      }

      return cameras;
    } catch (error) {
      logError("Gagal memuat daftar kamera", error);
      throw new Error(getCameraErrorMessage(error));
    }
  }

  // TODO [Basic] Memulai kamera dengan perangkat yang dipilih dan menampilkan pada elemen video
  async startCamera(videoId, canvasId, cameraSelect) {
    try {
      this.initializeElements(videoId, canvasId);
      this.stopCamera();

      const selectedCameraId = cameraSelect?.value || undefined;
      const constraints = getCameraConstraints(selectedCameraId, this.config);

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.video) {
        this.video.srcObject = this.stream;
        await this.video.play();
      }

      return true;
    } catch (error) {
      logError("Gagal memulai kamera", error);
      throw new Error(getCameraErrorMessage(error));
    }
  }

  // TODO [Basic] Menghentikan siaran kamera dan membersihkan sumber daya
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
  }

  // TODO [Skilled] Implementasikan metode untuk mengatur FPS kamera
  setFPS(fps) {
    const parsedFPS = Number(fps);

    if (
      Number.isNaN(parsedFPS) ||
      parsedFPS < this.config.fpsRange.min ||
      parsedFPS > this.config.fpsRange.max
    ) {
      logError(
        "FPS tidak valid",
        new Error(
          `FPS harus berada di antara ${this.config.fpsRange.min}-${this.config.fpsRange.max}.`,
        ),
      );
      return;
    }

    this.config.defaultFPS = parsedFPS;
  }

  // TODO [Basic] Periksa apakah kamera sedang aktif
  isActive() {
    return Boolean(this.stream?.active);
  }

  isReady() {
    return (
      this.isActive() &&
      this.video &&
      this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      !this.video.paused
    );
  }

  captureFrame() {
    if (!this.isReady() || !this.canvas) {
      return null;
    }

    const context = this.canvas.getContext("2d");

    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    return this.canvas;
  }
}

export default CameraService;
