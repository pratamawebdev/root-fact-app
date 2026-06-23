const APP_CONFIG = {
  detectionConfidenceThreshold: 70,
  factsGenerationDelay: 2000,
  detectionRetryInterval: 100,
};

const UI_CONFIG = {
  animationDuration: 300,
  fadeAnimation: "fadeIn 0.5s ease-out forwards",
  confidenceThresholds: {
    excellent: 90,
    good: 80,
  },
  factsCardOpacity: {
    loading: 0.6,
    normal: 1.0,
  },
};

const CAMERA_CONFIG = {
  // Used when a real deviceId isn't selected yet (e.g. before permission
  // has been granted and device labels become available).
  defaultFacingMode: "environment",
  frontFacingMode: "user",
  videoConstraints: {
    width: { ideal: 640 },
    height: { ideal: 480 },
  },
  fps: {
    min: 15,
    max: 60,
    default: 30,
    step: 15,
  },
};

const MODEL_CONFIG = {
  // Served as static assets (see webpack CopyWebpackPlugin) so they can be
  // precached by Workbox for offline detection.
  visionModelUrl: "/model/model.json",
  visionMetadataUrl: "/model/metadata.json",
  // Lightweight seq2seq model, compatible with Transformers.js + WebGPU/WASM.
  factsModelId: "Xenova/flan-t5-small",
};

export { APP_CONFIG, UI_CONFIG, CAMERA_CONFIG, MODEL_CONFIG };
