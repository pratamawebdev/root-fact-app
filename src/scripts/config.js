const APP_CONFIG = {
  detectionConfidenceThreshold: 65,
  analyzingDelay: 1200,
  factsGenerationDelay: 500,
  detectionRetryInterval: 100,
  modelBasePath: "/model",
  hfModel: "Xenova/flan-t5-small",
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
  defaultFPS: 30,
  width: { ideal: 640 },
  height: { ideal: 480 },
  facingMode: "environment",
};

export { APP_CONFIG, UI_CONFIG, CAMERA_CONFIG };
