import { CAMERA_CONFIG } from "../config.js";
import { getCameraErrorMessage, logError } from "../utils/index.js";

/**
 * Wraps the MediaStream (getUserMedia) API: device enumeration, starting /
 * stopping the camera stream, and a configurable FPS limit used to throttle
 * how often the detection loop is allowed to run.
 */
class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = CAMERA_CONFIG;
    this.devices = [];
    this.currentFPS = CAMERA_CONFIG.fps.default;
  }

  initializeElements(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);
  }

  /**
   * Enumerates available video input devices. When `cameraSelect` is
   * provided and device labels are available (i.e. permission was already
   * granted at least once), the dropdown options are replaced with the real
   * device list instead of the generic "Belakang/Depan" placeholders.
   */
  async loadCameras(cameraSelect) {
    if (!navigator.mediaDevices?.enumerateDevices) return [];

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      this.devices = allDevices.filter((device) => device.kind === "videoinput");

      const hasLabels = this.devices.some((device) => Boolean(device.label));

      if (cameraSelect && hasLabels) {
        const previousValue = cameraSelect.value;
        cameraSelect.innerHTML = "";

        this.devices.forEach((device, index) => {
          const option = document.createElement("option");
          option.value = device.deviceId;
          option.textContent = device.label || `Kamera ${index + 1}`;
          cameraSelect.appendChild(option);
        });

        const stillExists = this.devices.some((device) => device.deviceId === previousValue);
        if (stillExists) cameraSelect.value = previousValue;
      }

      return this.devices;
    } catch (error) {
      logError("CameraService.loadCameras", error);
      return [];
    }
  }

  /**
   * Builds getUserMedia constraints. If `selectedValue` matches a real
   * enumerated deviceId, that device is targeted directly. Otherwise it
   * falls back to the default "Belakang"/"Depan" facingMode options.
   */
  #getConstraints(selectedValue) {
    const { videoConstraints, defaultFacingMode, frontFacingMode } = this.config;
    const isRealDeviceId = this.devices.some((device) => device.deviceId === selectedValue);

    if (isRealDeviceId) {
      return {
        audio: false,
        video: {
          ...videoConstraints,
          deviceId: { exact: selectedValue },
        },
      };
    }

    const facingMode = selectedValue === "front" ? frontFacingMode : defaultFacingMode;
    return {
      audio: false,
      video: {
        ...videoConstraints,
        facingMode,
      },
    };
  }

  async startCamera(videoId, canvasId, cameraSelect) {
    this.initializeElements(videoId, canvasId);

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser tidak mendukung akses kamera (MediaStream API).");
    }

    this.stopCamera();

    const selectedValue = cameraSelect?.value ?? "default";
    const constraints = this.#getConstraints(selectedValue);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      logError("CameraService.startCamera", error);
      throw new Error(getCameraErrorMessage(error));
    }

    if (this.video) {
      this.video.srcObject = this.stream;
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          resolve();
        };
      });
    }

    this.setFPS(this.currentFPS);

    // Permission is granted now, so device labels are readable — refresh
    // the dropdown with real device names instead of the generic fallback.
    await this.loadCameras(cameraSelect);

    return this.stream;
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  /** Configurable FPS Limit — throttles the *detection loop*, and is also
   * applied to the live capture track via applyConstraints when supported. */
  setFPS(fps) {
    const { min, max } = this.config.fps;
    this.currentFPS = Math.min(Math.max(fps, min), max);

    const track = this.stream?.getVideoTracks?.()[0];
    if (track && typeof track.applyConstraints === "function") {
      track.applyConstraints({ frameRate: { ideal: this.currentFPS } }).catch(() => {
        // Not all devices/browsers support live frameRate renegotiation —
        // the detection loop throttle below still enforces the FPS limit.
      });
    }

    return this.currentFPS;
  }

  getFPS() {
    return this.currentFPS;
  }

  isActive() {
    return Boolean(
      this.stream && this.stream.getVideoTracks().some((track) => track.readyState === "live"),
    );
  }
}

export default CameraService;
