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
  }

  async loadCameras(cameraSelect) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser tidak mendukung akses kamera.");
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === "videoinput");

    if (!cameraSelect || videoDevices.length === 0) return videoDevices;

    cameraSelect.innerHTML = "";
    videoDevices.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `Kamera ${index + 1}`;
      cameraSelect.appendChild(option);
    });

    return videoDevices;
  }

  getConstraints(selectedDeviceId) {
    const frameRate = { ideal: this.config.defaultFPS, max: this.config.defaultFPS };

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
        facingMode: selectedDeviceId === "front" ? "user" : this.config.facingMode,
        width: this.config.width,
        height: this.config.height,
        frameRate,
      },
      audio: false,
    };
  }

  async startCamera(videoId, canvasId, cameraSelect) {
    this.initializeElements(videoId, canvasId);
    this.stopCamera();

    const selectedDeviceId = cameraSelect?.value || "default";
    this.stream = await navigator.mediaDevices.getUserMedia(this.getConstraints(selectedDeviceId));
    this.video.srcObject = this.stream;

    await new Promise((resolve) => {
      this.video.onloadedmetadata = () => resolve();
    });

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
      videoTrack.applyConstraints({ frameRate: { ideal: this.config.defaultFPS, max: this.config.defaultFPS } }).catch(() => {});
    }
  }

  isActive() {
    return Boolean(this.stream?.active && this.video?.srcObject);
  }
}

export default CameraService;
