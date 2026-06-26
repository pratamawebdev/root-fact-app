import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";
import { TENSORFLOW_CONFIG } from "../config.js";
import {
  isWebGPUSupported,
  logError,
  validateModelMetadata,
} from "../utils/index.js";

class DetectionService {
  constructor(onProgress = null) {
    this.model = null;
    this.labels = [];
    this.config = TENSORFLOW_CONFIG;
    this.onProgress = onProgress;
    this.performanceStats = {
      operations: 0,
      totalTime: 0,
      averageTime: 0,
    };
  }

  // TODO [Basic] Muat model dan metadata secara bersamaan, lalu simpan ke instance
  // TODO [Advance] Implementasikan strategi Backend Adaptive
  async loadModel() {
    try {
      this.#emitProgress(0, "Menunggu Model... 0%");

      const backend = await this.#setAdaptiveBackend();
      const [metadata, model] = await Promise.all([
        fetch(this.config.metadataPath).then((response) => {
          if (!response.ok) {
            throw new Error(
              `Metadata gagal dimuat (${response.status} ${response.statusText})`,
            );
          }

          return response.json();
        }),
        tf.loadLayersModel(this.config.modelPath, {
          onProgress: (fraction) => {
            const progress = Math.max(1, Math.round(fraction * 100));
            this.#emitProgress(
              progress,
              `Menunggu Model... ${progress}% (${backend.toUpperCase()})`,
            );
          },
        }),
      ]);

      if (!validateModelMetadata(metadata)) {
        throw new Error("Metadata model tidak valid.");
      }

      this.model = model;
      this.labels = metadata.labels;
      this.#emitProgress(100, `Model siap`);

      return {
        success: true,
        labels: this.labels,
        backend,
        modelName: metadata.modelName || "Unknown model",
      };
    } catch (error) {
      logError("Gagal memuat model deteksi", error);
      throw new Error(`Gagal memuat model: ${error.message}`);
    }
  }

  // TODO [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
  async predict(imageElement) {
    if (!this.model) {
      throw new Error("Model belum dimuat.");
    }

    if (!imageElement) {
      throw new Error("Elemen gambar tidak tersedia untuk prediksi.");
    }

    const startTime = performance.now();

    try {
      const predictionResult = tf.tidy(() => {
        const inputTensor = tf.browser
          .fromPixels(imageElement)
          .resizeBilinear(this.config.inputSize)
          .toFloat()
          .div(this.config.normalizationFactor)
          .expandDims(0);

        const rawPrediction = this.model.predict(inputTensor);
        const predictionTensor = Array.isArray(rawPrediction)
          ? rawPrediction[0]
          : rawPrediction;
        const values = Array.from(predictionTensor.dataSync());
        const maxScore = Math.max(...values);
        const maxIndex = values.indexOf(maxScore);

        return {
          values,
          maxIndex,
          maxScore,
        };
      });

      const elapsed = performance.now() - startTime;

      this.performanceStats.operations += 1;
      this.performanceStats.totalTime += elapsed;
      this.performanceStats.averageTime =
        this.performanceStats.totalTime / this.performanceStats.operations;

      const confidence = Math.round(predictionResult.maxScore * 100);
      const className = this.labels[predictionResult.maxIndex] || "Unknown";
      const isValid = confidence >= this.config.confidenceThreshold;

      return {
        className,
        confidence,
        score: predictionResult.maxScore,
        isValid,
        allPredictions: this.labels
          .map((label, index) => ({
            className: label,
            confidence: Math.round(predictionResult.values[index] * 100),
          }))
          .sort((a, b) => b.confidence - a.confidence),
        performance: {
          operationTime: Math.round(elapsed),
          averageTime: Math.round(this.performanceStats.averageTime),
          totalOperations: this.performanceStats.operations,
          backend: tf.getBackend(),
        },
      };
    } catch (error) {
      logError("Prediksi deteksi gagal", error);
      throw new Error(`Prediksi gagal: ${error.message}`);
    }
  }

  isLoaded() {
    return Boolean(this.model);
  }

  #emitProgress(progress, message) {
    if (typeof this.onProgress === "function") {
      this.onProgress({ progress, message });
    }
  }

  async #setAdaptiveBackend() {
    if (isWebGPUSupported()) {
      try {
        await tf.setBackend("webgpu");
        await tf.ready();
        return tf.getBackend();
      } catch (error) {
        logError("Backend WebGPU gagal, fallback ke WebGL", error);
      }
    }

    await tf.setBackend("webgl");
    await tf.ready();

    return tf.getBackend();
  }
}

export default DetectionService;
