export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = {
      fps: 30,
      cameras: [],
      selectedCameraId: null,
    };
  }

  setVideoElement(videoElement) {
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  // TODO [Basic] Tambahkan konfigurasi kamera untuk mendapatkan daftar perangkat input video
  // TODO [Basic] Dapatkan constraints kamera berdasarkan konfigurasi dan kamera yang dipilih
  async loadCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.config.cameras = devices.filter((d) => d.kind === 'videoinput');
      return this.config.cameras;
    } catch (error) {
      console.error('Gagal memuat daftar kamera:', error);
      throw error;
    }
  }

  _getConstraints(selectedCameraId) {
    const constraints = { video: {} };
    if (selectedCameraId) {
      constraints.video.deviceId = { exact: selectedCameraId };
    } else {
      constraints.video.facingMode = 'environment';
    }
    constraints.video.width = { ideal: 640 };
    constraints.video.height = { ideal: 480 };
    return constraints;
  }

  // TODO [Basic] Memulai kamera dengan perangkat yang dipilih dan menampilkan pada elemen video
  async startCamera(selectedCameraId) {
    // Hentikan stream sebelumnya jika ada
    this.stopCamera();

    try {
      const constraints = this._getConstraints(selectedCameraId);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.config.selectedCameraId = selectedCameraId || null;

      if (this.video) {
        this.video.srcObject = this.stream;
        await this.video.play();
      }
      return true;
    } catch (error) {
      console.error('Gagal memulai kamera:', error);
      throw error;
    }
  }

  // TODO [Basic] Menghentikan siaran kamera dan membersihkan sumber daya
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  // TODO [Skilled] Implementasikan metode untuk mengatur FPS kamera
  setFPS(fps) {
    this.config.fps = Math.max(1, Math.min(60, Number(fps)));
  }

  getFPS() {
    return this.config.fps;
  }

  getFrameInterval() {
    return 1000 / this.config.fps;
  }

  // TODO [Basic] Periksa apakah kamera sedang aktif
  isActive() {
    return !!this.stream && this.stream.active;
  }

  // TODO [Basic] Periksa apakah elemen video siap untuk digunakan
  isReady() {
    return this.video && this.video.readyState >= 2;
  }
}