import { CAMERA_CONFIG } from "../config.js";

class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = { ...CAMERA_CONFIG };
  }

  initializeElements(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);

    if (!this.video || !this.canvas) {
      throw new Error("Elemen video atau canvas tidak ditemukan.");
    }

    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute("playsinline", "true");
  }

  validateCameraSupport() {
    if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      throw new Error("Kamera hanya bisa dibuka dari HTTPS atau localhost. Deploy ke Netlify atau jalankan di localhost.");
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser tidak mendukung akses kamera. Coba pakai Chrome, Edge, atau Safari terbaru.");
    }
  }

  async loadCameras(cameraSelect) {
    this.validateCameraSupport();

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === "videoinput");

    if (!cameraSelect || videoDevices.length === 0) return videoDevices;

    const currentValue = cameraSelect.value;
    cameraSelect.innerHTML = "";

    videoDevices.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `Kamera ${index + 1}`;
      cameraSelect.appendChild(option);
    });

    const hasPreviousValue = videoDevices.some((device) => device.deviceId === currentValue);
    if (hasPreviousValue) cameraSelect.value = currentValue;

    return videoDevices;
  }

  getConstraints(selectedDeviceId) {
    const frameRate = { ideal: this.config.defaultFPS };

    if (selectedDeviceId && selectedDeviceId !== "default" && selectedDeviceId !== "front") {
      return {
        video: {
          deviceId: { exact: selectedDeviceId },
          width: this.config.width,
          height: this.config.height,
          frameRate,
        },
        audio: false,
      };
    }

    return {
      video: {
        facingMode: { ideal: selectedDeviceId === "front" ? "user" : this.config.facingMode },
        width: this.config.width,
        height: this.config.height,
        frameRate,
      },
      audio: false,
    };
  }

  getFallbackConstraints() {
    return {
      video: true,
      audio: false,
    };
  }

  async requestCameraStream(selectedDeviceId) {
    try {
      return await navigator.mediaDevices.getUserMedia(this.getConstraints(selectedDeviceId));
    } catch (error) {
      console.warn("Constraint kamera utama gagal, mencoba fallback video:true.", error);
      return await navigator.mediaDevices.getUserMedia(this.getFallbackConstraints());
    }
  }

  async waitVideoReady() {
    if (this.video.readyState >= 2) return;

    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("Kamera terbuka, tetapi video belum siap. Coba refresh halaman."));
      }, 8000);

      const cleanup = () => {
        window.clearTimeout(timeout);
        this.video.removeEventListener("loadedmetadata", onReady);
        this.video.removeEventListener("canplay", onReady);
        this.video.removeEventListener("error", onError);
      };

      const onReady = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error("Video kamera gagal dimuat."));
      };

      this.video.addEventListener("loadedmetadata", onReady, { once: true });
      this.video.addEventListener("canplay", onReady, { once: true });
      this.video.addEventListener("error", onError, { once: true });
    });
  }

  async startCamera(videoId, canvasId, cameraSelect) {
    this.initializeElements(videoId, canvasId);
    this.validateCameraSupport();
    this.stopCamera();

    const selectedDeviceId = cameraSelect?.value || "default";
    this.stream = await this.requestCameraStream(selectedDeviceId);
    this.video.srcObject = this.stream;

    await this.waitVideoReady();
    await this.video.play();
    await this.loadCameras(cameraSelect);

    return this.stream;
  }

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

  setFPS(fps) {
    const parsedFPS = Number(fps);
    this.config.defaultFPS = Number.isFinite(parsedFPS) ? parsedFPS : CAMERA_CONFIG.defaultFPS;

    const videoTrack = this.stream?.getVideoTracks?.()[0];
    if (videoTrack?.applyConstraints) {
      videoTrack.applyConstraints({ frameRate: { ideal: this.config.defaultFPS } }).catch(() => {});
    }
  }

  isActive() {
    return Boolean(this.stream?.active && this.video?.srcObject);
  }
}

export default CameraService;
