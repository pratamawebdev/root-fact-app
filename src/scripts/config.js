const APP_CONFIG = {
  detectionConfidenceThreshold: 70,
  analyzingDelay: 2000,
  factsGenerationDelay: 2000,
  detectionRetryInterval: 100,
};

const TENSORFLOW_CONFIG = {
  modelPath: "/model/model.json",
  metadataPath: "/model/metadata.json",
  inputSize: [224, 224],
  normalizationFactor: 255,
  confidenceThreshold: 70,
};

const CAMERA_CONFIG = {
  defaultFPS: 30,
  fpsRange: { min: 15, max: 60 },
  desktopResolution: { width: 640, height: 480 },
  mobileResolution: { width: 480, height: 640 },
  desktopFacingMode: "user",
  mobileFacingMode: "environment",
};

const TRANSFORMERS_CONFIG = {
  modelName: "Xenova/LaMini-Flan-T5-77M",
  dtype: "q4",
  fallbackDevice: "wasm",
  maxInputLength: 40,
  maxNewTokens: 110,
  temperature: 0.7,
  topP: 0.9,
  doSample: true,
  tones: {
    normal: "Use a warm and informative tone.",
    funny: "Use a playful, funny tone with light humor.",
    professional: "Use a professional educational tone.",
    casual: "Use a friendly casual tone for everyday readers.",
  },
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

export {
  APP_CONFIG,
  TENSORFLOW_CONFIG,
  CAMERA_CONFIG,
  TRANSFORMERS_CONFIG,
  UI_CONFIG,
};
