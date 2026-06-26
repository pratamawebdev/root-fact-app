import { pipeline } from "@huggingface/transformers";
import { APP_CONFIG, TRANSFORMERS_CONFIG } from "../config.js";
import { createDelay, isWebGPUSupported, logError } from "../utils/index.js";

class RootFactsService {
  constructor(onProgress = null) {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = TRANSFORMERS_CONFIG;
    this.currentBackend = null;
    this.currentTone = "normal";
    this.onProgress = onProgress;
  }

  // TODO [Basic] Muat model dan inisialisasi pipeline text2text-generation
  // TODO [Advance] Implementasikan strategi Backend Adaptive
  async loadModel() {
    try {
      const device = isWebGPUSupported()
        ? "webgpu"
        : this.config.fallbackDevice;

      this.#emitProgress(`Memuat model AI (${device.toUpperCase()})...`);

      this.generator = await pipeline(
        "text2text-generation",
        this.config.modelName,
        {
          dtype: this.config.dtype,
          device,
        },
      );

      await createDelay(APP_CONFIG.factsGenerationDelay);

      this.isModelLoaded = true;
      this.currentBackend = device;
      this.#emitProgress(`Model siap`);

      return {
        success: true,
        model: this.config.modelName,
        backend: this.currentBackend,
      };
    } catch (error) {
      this.isModelLoaded = false;
      logError("Gagal memuat model RootFacts", error);
      throw new Error(`Gagal memuat model: ${error.message}`);
    }
  }

  // TODO [Advance] Konfigurasi tone fakta yang dihasilkan
  setTone(tone) {
    const nextTone = this.config.tones[tone] ? tone : "normal";
    this.currentTone = nextTone;
  }

  // TODO [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
  // TODO [Basic] Tambahkan validasi untuk maksimum panjang input dan pembersihan input terhadap karakter khusus untuk mengatasi prompt injection
  // TODO [Skilled] Konfigurasikan parameter generasi berdasarkan kebutuhan
  // TODO [Advance] Implemenasikan parameter tone untuk mengatur nada fakta yang dihasilkan
  async generateFacts(vegetable, tone = "normal") {
    if (!this.isReady()) {
      throw new Error("Model belum siap.");
    }

    const safeVegetable = this.#sanitizeVegetableInput(vegetable);
    if (!safeVegetable) {
      throw new Error("Label sayuran tidak valid untuk diproses.");
    }

    this.setTone(tone);

    try {
      this.isGenerating = true;
      await createDelay(400);

      const toneInstruction =
        this.config.tones[this.currentTone] || this.config.tones.normal;
      const prompt = [
        `Write one fun fact about ${safeVegetable}.`,
        toneInstruction,
        "Use English.",
        "Keep it within 2 sentences and make it relevant to the vegetable.",
        "Do not mention that you are an AI.",
      ].join(" ");

      const result = await this.generator(prompt, {
        max_new_tokens: this.config.maxNewTokens,
        temperature: this.config.temperature,
        top_p: this.config.topP,
        do_sample: this.config.doSample,
      });

      return {
        vegetable: safeVegetable,
        tone: this.currentTone,
        fact: result[0]?.generated_text?.trim() || "",
        backend: this.currentBackend,
      };
    } catch (error) {
      logError("Gagal menghasilkan fakta", error);
      throw new Error(`Gagal menghasilkan fakta: ${error.message}`);
    } finally {
      this.isGenerating = false;
    }
  }

  // TODO [Basic] Periksa apakah model sudah dimuat dan siap digunakan
  isReady() {
    return this.isModelLoaded && !this.isGenerating && Boolean(this.generator);
  }

  #sanitizeVegetableInput(input) {
    if (typeof input !== "string") {
      return "";
    }

    const sanitized = input
      .replace(/[^a-zA-Z\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, this.config.maxInputLength);

    return sanitized;
  }

  #emitProgress(message) {
    if (typeof this.onProgress === "function") {
      this.onProgress({ message });
    }
  }
}

export default RootFactsService;
