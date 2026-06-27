import { useRef, useState, useEffect, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import Header from './components/Header';
import CameraSection from './components/CameraSection';
import InfoPanel from './components/InfoPanel';
import { useAppState } from './hooks/useAppState';
import { CameraService } from './services/CameraService';
import { DetectionService } from './services/DetectionService';
import { RootFactsService } from './services/RootFactsService';
import { APP_CONFIG } from './utils/config';

function App() {
  const { state, actions } = useAppState();
  const detectionCleanupRef = useRef(null);
  const isRunningRef = useRef(false);
  const [currentTone, setCurrentTone] = useState('normal');
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2000);
  }, []);

  // Refs untuk services agar stabil di callbacks
  const cameraRef = useRef(null);
  const detectorRef = useRef(null);
  const generatorRef = useRef(null);

  // TODO [Basic] Inisialisasi layanan deteksi, kamera, dan generator fakta saat aplikasi dimuat
  useEffect(() => {
    let cancelled = false;

    const initServices = async () => {
      try {
        const camera = new CameraService();
        const detector = new DetectionService();
        const generator = new RootFactsService();

        cameraRef.current = camera;
        detectorRef.current = detector;
        generatorRef.current = generator;

        actions.setServices({ camera, detector, generator });

        // Muat model deteksi dengan progress callback
        actions.setModelStatus('Memuat Model Deteksi... 0%');
        await detector.loadModel((progress) => {
          if (!cancelled) {
            actions.setModelStatus(`Memuat Model... ${progress}%`);
          }
        });

        // Muat model AI untuk fakta
        if (!cancelled) {
          actions.setModelStatus('Memuat Model AI... 50%');
        }
        await generator.loadModel((progress) => {
          if (!cancelled) {
            actions.setModelStatus(`Memuat Model... ${progress}%`);
          }
        });

        if (!cancelled) {
          actions.setModelStatus('Model AI Siap');
        }
      } catch (error) {
        console.error('Gagal inisialisasi:', error);
        if (!cancelled) {
          actions.setModelStatus('Gagal memuat model');
          actions.setError('Gagal memuat model. Periksa koneksi.');
        }
      }
    };

    initServices();

    return () => {
      cancelled = true;
    };
  }, []);

  // TODO [Basic] Bersihkan sumber daya saat komponen ditinggalkan
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (detectionCleanupRef.current) {
        detectionCleanupRef.current();
      }
      if (cameraRef.current) {
        cameraRef.current.stopCamera();
      }
    };
  }, []);

  // TODO [Basic] Fungsi untuk memulai loop deteksi
  const startDetectionLoop = useCallback(() => {
    isRunningRef.current = true;
    let animationFrameId = null;
    let lastTime = 0;

    const detect = async (timestamp) => {
      if (!isRunningRef.current) return;

      const camera = cameraRef.current;
      const detector = detectorRef.current;
      const generator = generatorRef.current;

      if (!camera || !detector || !generator) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }

      // FPS limiter
      const frameInterval = camera.getFrameInterval();
      if (timestamp - lastTime < frameInterval) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }
      lastTime = timestamp;

      if (camera.isReady() && detector.isLoaded()) {
        try {
          const result = await detector.predict(camera.video);

          if (result && result.isValid) {
            // Tampilkan hasil deteksi
            actions.setDetectionResult(result);
            actions.setAppState('analyzing');
            actions.setFunFactData(null);

            // Hentikan loop sementara untuk generate fakta
            isRunningRef.current = false;

            try {
              const fact = await generator.generateFacts(result.className);
              actions.setFunFactData(fact || 'error');
              actions.setAppState('result');
            } catch (err) {
              console.error('Gagal generate fakta:', err);
              actions.setFunFactData('error');
              actions.setAppState('result');
            }

            // Lanjutkan loop setelah delay
            await new Promise((r) => setTimeout(r, APP_CONFIG.factsGenerationDelay));
            if (camera.isActive()) {
              isRunningRef.current = true;
              animationFrameId = requestAnimationFrame(detect);
            }
            return;
          }
        } catch (error) {
          console.error('Deteksi error:', error);
        }
      }

      animationFrameId = requestAnimationFrame(detect);
    };

    animationFrameId = requestAnimationFrame(detect);

    // Cleanup function
    detectionCleanupRef.current = () => {
      isRunningRef.current = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [actions]);

  // TODO [Basic] Fungsi untuk memulai dan menghentikan kamera
  const handleToggleCamera = useCallback(async () => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (camera.isActive()) {
      // Stop
      isRunningRef.current = false;
      if (detectionCleanupRef.current) {
        detectionCleanupRef.current();
      }
      camera.stopCamera();
      actions.setRunning(false);
      actions.resetResults();
    } else {
      // Start
      try {
        await camera.startCamera();
        actions.setRunning(true);
        actions.setError(null);
        startDetectionLoop();
      } catch (error) {
        console.error('Gagal memulai kamera:', error);
        actions.setError('Gagal memulai kamera. Periksa izin kamera.');
      }
    }
  }, [actions, startDetectionLoop]);

  // TODO [Advance] Fungsi untuk mengubah nada fakta yang dihasilkan
  const handleToneChange = useCallback((tone) => {
    setCurrentTone(tone);
    if (generatorRef.current) {
      generatorRef.current.setTone(tone);
    }
  }, []);

  // TODO [Skilled] Fungsi untuk menyalin fakta ke clipboard
  const handleCopyFact = useCallback(async () => {
    if (state.funFactData && state.funFactData !== 'error') {
      try {
        await navigator.clipboard.writeText(state.funFactData);
        showToast('Fakta berhasil disalin!');
      } catch (error) {
        console.error('Gagal menyalin:', error);
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = state.funFactData;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Fakta berhasil disalin!');
      }
    }
  }, [state.funFactData]);

  return (
    <div className="app-container">
      <Header modelStatus={state.modelStatus} />

      <main className="main-content">
        <CameraSection
          isRunning={state.isRunning}
          onToggleCamera={handleToggleCamera}
          onToneChange={handleToneChange}
          services={state.services}
          modelStatus={state.modelStatus}
          error={state.error}
          currentTone={currentTone}
        />

        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          onCopyFact={handleCopyFact}
        />
      </main>

      <footer className="footer">
        <p>Powered by TensorFlow.js & Transformers.js</p>
      </footer>

      {state.error && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '380px',
          padding: '0.875rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          fontSize: '0.8125rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1000
        }}>
          <strong>Error:</strong> {state.error}
          <button
            onClick={() => actions.setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#991b1b',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}

      {toastMessage && (
        <div className="toast-notification">
          <CheckCircle size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
