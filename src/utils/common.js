export const logError = (context, error) => {
  console.error(`❌ ${context}:`, error);
};

export const isWebGPUSupported = () => {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
};

export const isMobileDevice = () => {
  return navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const createDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const validateModelMetadata = (metadata) => {
  return metadata && metadata.labels && Array.isArray(metadata.labels);
};

export const getCameraErrorMessage = (error) => {
  const errorMessages = {
    'NotAllowedError': 'Izin kamera ditolak. Harap izinkan akses kamera.',
    'NotFoundError': 'Tidak ada kamera ditemukan pada perangkat ini.',
    'NotReadableError': 'Kamera sedang digunakan oleh aplikasi lain.'
  };

  return errorMessages[error.name] || 'Gagal memulai kamera';
};

export const getConfidenceTheme = (confidence) => {
  if (confidence >= 80) return 'theme-green';
  if (confidence >= 60) return 'theme-yellow';
  return 'theme-red';
};

export const getConfidenceTextClass = (confidence) => {
  if (confidence >= 80) return 'text-green';
  if (confidence >= 60) return 'text-yellow';
  return 'text-red';
};

export const createProgressBarStyle = (percentage, duration = '1s') => ({
  width: `${percentage}%`,
  transition: `width ${duration} ease-out`
});

export const isValidDetection = (result) => {
  const { detectionConfidenceThreshold } = APP_CONFIG;
  return result && result.isValid && result.confidence >= detectionConfidenceThreshold;
};