import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";
import { MODEL_CONFIG } from "../config.js";
import { isWebGPUSupported, logError, validateModelMetadata } from "../utils/index.js";

/**
 * Computer Vision service: loads the Teachable Machine (MobileNet) model
 * with an adaptive WebGPU -> WebGL backend, and runs predictions with
 * disciplined tensor cleanup (tf.tidy / dispose) so the browser stays light.
 */
class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.imageSize = 224;
    this.backend = null;
    this.performanceStats = {
      operations: 0,
      totalTime: 0,
      averageTime: 0,
    };
  }

  /** Backend Adaptif: try WebGPU when available, fall back to WebGL otherwise. */
  async #setupBackend() {
    if (isWebGPUSupported()) {
      try {
        await tf.setBackend("webgpu");
        await tf.ready();
        this.backend = "webgpu";
        return;
      } catch (error) {
        logError("DetectionService - WebGPU unavailable, falling back to WebGL", error);
      }
    }

    await tf.setBackend("webgl");
    await tf.ready();
    this.backend = "webgl";
  }

  /**
   * Loads the model + metadata concurrently.
   * @param {(fraction: number) => void} [onProgress] fraction between 0–1.
   */
  async loadModel(onProgress) {
    await this.#setupBackend();

    const [model, metadata] = await Promise.all([
      tf.loadLayersModel(MODEL_CONFIG.visionModelUrl, {
        onProgress: (fraction) => onProgress?.(fraction),
      }),
      fetch(MODEL_CONFIG.visionMetadataUrl).then((response) => response.json()),
    ]);

    if (!validateModelMetadata(metadata)) {
      throw new Error("Metadata model sayuran tidak valid.");
    }

    this.model = model;
    this.labels = metadata.labels;
    this.imageSize = metadata.imageSize ?? 224;

    // Warm up so the very first real prediction isn't penalized by lazy
    // kernel/shader compilation. Wrapped in tf.tidy so the warm-up tensors
    // are disposed immediately instead of lingering in memory.
    tf.tidy(() => {
      const warmupInput = tf.zeros([1, this.imageSize, this.imageSize, 3]);
      this.model.predict(warmupInput);
    });

    return { labels: this.labels, backend: this.backend };
  }

  /**
   * Runs a prediction on an image-like element (an HTMLVideoElement frame,
   * canvas, or image). Every tensor created during the cycle is disposed.
   */
  async predict(imageElement) {
    if (!this.model) {
      throw new Error("Model deteksi belum dimuat.");
    }

    const startTime = performance.now();

    const logits = tf.tidy(() => {
      const normalized = tf.browser
        .fromPixels(imageElement)
        .resizeBilinear([this.imageSize, this.imageSize])
        .toFloat()
        .div(255)
        .expandDims(0);

      return this.model.predict(normalized);
    });

    let predictions;
    try {
      predictions = await logits.data();
    } finally {
      logits.dispose();
    }

    const elapsed = performance.now() - startTime;
    this.performanceStats.operations += 1;
    this.performanceStats.totalTime += elapsed;
    this.performanceStats.averageTime =
      this.performanceStats.totalTime / this.performanceStats.operations;

    let bestIndex = 0;
    for (let i = 1; i < predictions.length; i += 1) {
      if (predictions[i] > predictions[bestIndex]) bestIndex = i;
    }

    return {
      isValid: true,
      label: this.labels[bestIndex] ?? "Tidak diketahui",
      confidence: Math.round(predictions[bestIndex] * 100),
      inferenceTimeMs: Math.round(elapsed),
    };
  }
}

export default DetectionService;
