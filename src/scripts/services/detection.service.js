import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";
import { APP_CONFIG } from "../config.js";
import { isWebGPUSupported, validateModelMetadata } from "../utils/index.js";

class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = { imageSize: 224 };
    this.backend = "webgl";
    this.performanceStats = {
      operations: 0,
      totalTime: 0,
      averageTime: 0,
    };
  }

  async setAdaptiveBackend() {
    const preferredBackend = isWebGPUSupported() ? "webgpu" : "webgl";

    try {
      await tf.setBackend(preferredBackend);
      await tf.ready();
      this.backend = preferredBackend;
    } catch (error) {
      console.warn(`Backend ${preferredBackend} gagal, fallback ke WebGL.`, error);
      await tf.setBackend("webgl");
      await tf.ready();
      this.backend = "webgl";
    }
  }

  async loadModel(onProgress = () => {}) {
    await this.setAdaptiveBackend();

    const metadataResponse = await fetch(`${APP_CONFIG.modelBasePath}/metadata.json`);
    if (!metadataResponse.ok) {
      throw new Error("metadata.json gagal dimuat.");
    }

    const metadata = await metadataResponse.json();
    if (!validateModelMetadata(metadata)) {
      throw new Error("Format metadata model tidak valid.");
    }

    this.labels = metadata.labels;
    this.config.imageSize = metadata.imageSize || 224;

    this.model = await tf.loadLayersModel(`${APP_CONFIG.modelBasePath}/model.json`, {
      onProgress: (fraction) => onProgress(Math.round(fraction * 100)),
    });

    onProgress(100);
    return {
      backend: this.backend,
      labels: this.labels,
      imageSize: this.config.imageSize,
    };
  }

  async predict(imageElement) {
    if (!this.model) {
      throw new Error("Model deteksi belum dimuat.");
    }

    const startedAt = performance.now();

    const predictionTensor = tf.tidy(() => {
      const pixels = tf.browser.fromPixels(imageElement);
      const resized = tf.image.resizeBilinear(pixels, [this.config.imageSize, this.config.imageSize]);
      const normalized = resized.toFloat().div(255);
      const batched = normalized.expandDims(0);
      return this.model.predict(batched);
    });

    const scores = await predictionTensor.data();
    predictionTensor.dispose();

    const probabilities = Array.from(scores);
    const bestIndex = probabilities.indexOf(Math.max(...probabilities));
    const confidence = Number((probabilities[bestIndex] * 100).toFixed(2));
    const label = this.labels[bestIndex] || "Unknown";

    const elapsed = performance.now() - startedAt;
    this.performanceStats.operations += 1;
    this.performanceStats.totalTime += elapsed;
    this.performanceStats.averageTime = this.performanceStats.totalTime / this.performanceStats.operations;

    return {
      label,
      confidence,
      isValid: confidence >= APP_CONFIG.detectionConfidenceThreshold,
      backend: this.backend,
      averageTime: this.performanceStats.averageTime,
    };
  }
}

export default DetectionService;
