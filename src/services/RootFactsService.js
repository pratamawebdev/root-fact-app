import { pipeline, env } from '@huggingface/transformers';
import { TONE_CONFIG } from '../utils/config.js';
import { isWebGPUSupported } from '../utils/common.js';

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = null;
    this.currentBackend = null;
    this.currentTone = TONE_CONFIG.defaultTone;
  }

  // TODO [Basic] Muat model dan inisialisasi pipeline text2text-generation
  // TODO [Advance] Implementasikan strategi Backend Adaptive
  async loadModel(onProgress) {
    try {
      // Backend Adaptif: cek navigator.gpu -> WebGPU, fallback ke wasm
      let device = 'wasm';
      if (isWebGPUSupported()) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            device = 'webgpu';
            console.log('✅ RootFactsService: Menggunakan backend WebGPU');
          }
        } catch (e) {
          console.warn('⚠️ WebGPU gagal untuk Transformers.js, fallback ke wasm:', e);
        }
      }

      if (device !== 'webgpu') {
        console.log('✅ RootFactsService: Menggunakan backend WASM');
      }
      this.currentBackend = device;

      // Aktifkan cache lokal
      env.allowLocalModels = false;

      // Inisialisasi pipeline text2text-generation
      this.generator = await pipeline(
        'text2text-generation',
        'Xenova/LaMini-Flan-T5-77M',
        {
          device,
          progress_callback: (progress) => {
            if (onProgress && progress.progress) {
              // Map progress 0-100 menjadi 50-100 (karena detection model pakai 0-50)
              const mapped = 50 + Math.round(progress.progress / 2);
              onProgress(mapped);
            }
          },
        }
      );

      this.isModelLoaded = true;
      if (onProgress) onProgress(100);
      console.log('✅ RootFactsService: Model siap');
      return true;
    } catch (error) {
      console.error('❌ Gagal memuat model RootFacts:', error);
      throw error;
    }
  }

  // TODO [Advance] Konfigurasi tone fakta yang dihasilkan
  setTone(tone) {
    const validTones = TONE_CONFIG.availableTones.map((t) => t.value);
    if (validTones.includes(tone)) {
      this.currentTone = tone;
    }
  }

  _buildPrompt(vegetableName) {
    const tonePrompts = {
      normal: `Tell me a unique and interesting fun fact about the vegetable "${vegetableName}". Be informative and concise.`,
      funny: `Tell me a funny and hilarious fun fact about the vegetable "${vegetableName}". Use humor and jokes. Be entertaining!`,
      professional: `Provide a scientifically accurate and detailed fun fact about the vegetable "${vegetableName}". Include botanical or nutritional information.`,
      casual: `Hey! Tell me something cool and surprising about "${vegetableName}" in a casual, friendly way. Keep it short and fun!`,
    };

    return tonePrompts[this.currentTone] || tonePrompts.normal;
  }

  // TODO [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
  // TODO [Skilled] Konfigurasikan parameter generasi berdasarkan kebutuhan
  // TODO [Advance] Implemenasikan parameter tone untuk mengatur nada fakta yang dihasilkan
  async generateFacts(vegetableName) {
    if (!this.generator) {
      throw new Error('Model belum dimuat');
    }

    if (this.isGenerating) {
      return null;
    }

    this.isGenerating = true;

    try {
      const prompt = this._buildPrompt(vegetableName);

      // Parameter generasi untuk menjaga performa
      const result = await this.generator(prompt, {
        max_new_tokens: 100,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
      });

      const generatedText =
        result && result[0] && result[0].generated_text
          ? result[0].generated_text.trim()
          : 'Tidak ada fakta yang dihasilkan.';

      return generatedText;
    } catch (error) {
      console.error('❌ Gagal menghasilkan fakta:', error);
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  // TODO [Basic] Periksa apakah model sudah dimuat dan siap digunakan
  isReady() {
    return this.isModelLoaded;
  }
}
