import { pipeline, env } from "@huggingface/transformers";
import { APP_CONFIG } from "../config.js";
import { isWebGPUSupported } from "../utils/index.js";

class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = {
      maxInputLength: 40,
      max_new_tokens: 90,
      temperature: 0.85,
      top_p: 0.9,
      do_sample: true,
    };
    this.currentBackend = null;
    this.currentTone = "normal";
  }

  async loadModel() {
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    this.currentBackend = isWebGPUSupported() ? "webgpu" : "wasm";

    try {
      this.generator = await pipeline("text2text-generation", APP_CONFIG.hfModel, {
        dtype: "q4",
        device: this.currentBackend,
      });
    } catch (error) {
      console.warn("Transformers WebGPU gagal, fallback ke WASM.", error);
      this.currentBackend = "wasm";
      this.generator = await pipeline("text2text-generation", APP_CONFIG.hfModel, {
        dtype: "q4",
        device: "wasm",
      });
    }

    this.isModelLoaded = true;
    return { backend: this.currentBackend };
  }

  setTone(tone) {
    this.currentTone = tone || "normal";
  }

  sanitizeVegetableName(vegetable) {
    return String(vegetable || "vegetable")
      .replace(/[^a-zA-Z\s-]/g, "")
      .trim()
      .slice(0, this.config.maxInputLength);
  }

  getToneInstruction(tone) {
    const tones = {
      normal: "Use a clear and friendly style.",
      funny: "Use a funny, playful style, but keep the fact accurate.",
      professional: "Use a concise educational style for students.",
      casual: "Use a relaxed daily conversation style.",
      history: "Mention a simple historical or cultural angle if possible.",
    };

    return tones[tone] || tones.normal;
  }

  getFallbackFact(vegetable, tone) {
    const facts = {
      funny: `${vegetable} punya sisi unik: warna, aroma, atau teksturnya sering menjadi petunjuk kandungan alami di dalamnya. Lumayan keren untuk bahan dapur yang terlihat sederhana!`,
      professional: `${vegetable} merupakan sayuran yang dapat menjadi sumber serat dan senyawa bioaktif. Kandungan spesifiknya dapat berbeda tergantung varietas, kesegaran, dan cara pengolahan.`,
      casual: `${vegetable} bukan cuma bahan masakan. Sayuran ini punya rasa, tekstur, dan manfaat yang bisa berubah tergantung cara kamu memasaknya.`,
      history: `${vegetable} memiliki hubungan panjang dengan pola makan manusia. Banyak sayuran menyebar ke berbagai wilayah karena perdagangan, pertanian, dan kebiasaan kuliner lokal.`,
      normal: `${vegetable} memiliki karakter alami yang menarik, mulai dari warna, tekstur, sampai kandungan nutrisinya. Cara memasak yang tepat bisa membantu menjaga rasa dan kualitasnya.`,
    };

    return facts[tone] || facts.normal;
  }

  async generateFacts(vegetable, tone = this.currentTone) {
    const cleanVegetable = this.sanitizeVegetableName(vegetable);
    const selectedTone = tone || this.currentTone;

    if (!cleanVegetable) {
      throw new Error("Nama sayuran tidak valid.");
    }

    if (!this.isReady()) {
      return this.getFallbackFact(cleanVegetable, selectedTone);
    }

    if (this.isGenerating) {
      return "AI sedang menyiapkan fakta sebelumnya. Coba pindai lagi sebentar lagi.";
    }

    this.isGenerating = true;

    try {
      const prompt = `Write one unique fun fact about ${cleanVegetable}. ${this.getToneInstruction(selectedTone)} Keep it under 55 words. Do not write a recipe.`;
      const output = await this.generator(prompt, {
        max_new_tokens: this.config.max_new_tokens,
        temperature: this.config.temperature,
        top_p: this.config.top_p,
        do_sample: this.config.do_sample,
      });

      const generatedText = output?.[0]?.generated_text || output?.[0]?.summary_text || "";
      return generatedText.trim() || this.getFallbackFact(cleanVegetable, selectedTone);
    } catch (error) {
      console.warn("Gagal membuat fun fact dengan AI lokal.", error);
      return this.getFallbackFact(cleanVegetable, selectedTone);
    } finally {
      this.isGenerating = false;
    }
  }

  isReady() {
    return Boolean(this.generator && this.isModelLoaded);
  }
}

export default RootFactsService;
