import * as tf from '@tensorflow/tfjs';
import { isWebGPUSupported } from '../utils/common.js';

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
    this.currentBackend = null;
  }

  // TODO [Basic] Muat model dan metadata secara bersamaan, lalu simpan ke instance
  // TODO [Advance] Implementasikan strategi Backend Adaptive
  async loadModel(onProgress) {
    try {
      // Backend Adaptif: cek navigator.gpu -> WebGPU, fallback ke WebGL
      if (isWebGPUSupported()) {
        try {
          await tf.setBackend('webgpu');
          await tf.ready();
          this.currentBackend = 'webgpu';
          console.log('✅ DetectionService: Menggunakan backend WebGPU');
        } catch (e) {
          console.warn('⚠️ WebGPU gagal, fallback ke WebGL:', e);
          await tf.setBackend('webgl');
          await tf.ready();
          this.currentBackend = 'webgl';
          console.log('✅ DetectionService: Fallback ke backend WebGL');
        }
      } else {
        await tf.setBackend('webgl');
        await tf.ready();
        this.currentBackend = 'webgl';
        console.log('✅ DetectionService: Menggunakan backend WebGL');
      }

      if (onProgress) onProgress(20);

      // Muat model dan metadata secara bersamaan
      // Model ini adalah Teachable Machine (Layers model), bukan Graph model
      const [model, metadataResponse] = await Promise.all([
        tf.loadLayersModel('/model/model.json'),
        fetch('/model/metadata.json'),
      ]);

      if (onProgress) onProgress(40);

      this.model = model;

      const metadata = await metadataResponse.json();
      if (metadata && metadata.labels) {
        this.labels = metadata.labels;
      }

      if (onProgress) onProgress(50);

      console.log(`✅ DetectionService: Model dimuat. Labels: ${this.labels.length}`, this.labels);
      return true;
    } catch (error) {
      console.error('❌ Gagal memuat model deteksi:', error);
      throw error;
    }
  }

  // TODO [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
  async predict(imageElement) {
    if (!this.model) {
      throw new Error('Model belum dimuat');
    }

    try {
      // Ubah elemen gambar/video menjadi tensor (input 224x224 sesuai metadata)
      const tensor = tf.browser
        .fromPixels(imageElement)
        .resizeBilinear([224, 224])
        .expandDims(0)
        .div(255.0);

      // Jalankan prediksi
      const predictions = this.model.predict(tensor);
      const data = await predictions.data();

      // Cari indeks dengan skor tertinggi
      let maxIndex = 0;
      let maxScore = data[0];
      for (let i = 1; i < data.length; i++) {
        if (data[i] > maxScore) {
          maxScore = data[i];
          maxIndex = i;
        }
      }

      // Bersihkan tensor
      tensor.dispose();
      predictions.dispose();

      const className = this.labels[maxIndex] || `class_${maxIndex}`;

      return {
        className,
        score: maxScore,
        isValid: maxScore > 0.3,
      };
    } catch (error) {
      console.error('❌ Gagal melakukan prediksi:', error);
      throw error;
    }
  }

  // TODO [Basic] Periksa apakah model sudah dimuat dan siap digunakan
  isLoaded() {
    return !!this.model;
  }
}
