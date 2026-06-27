import { pipeline } from "@huggingface/transformers";
import { MODEL_CONFIG } from "../config.js";
import { isWebGPUSupported, logError } from "../utils/index.js";

const MAX_VEGETABLE_LENGTH = 50;

// Persona Dinamis: each tone reframes the generation prompt's style.
const TONE_PERSONAS = {
  normal: "a friendly, informative guide",
  funny: "a witty comedian who loves silly jokes",
  professional: "a formal food scientist",
  casual: "a relaxed friend chatting casually",
};

/**
 * Generative AI service: loads a local Transformers.js text2text-generation
 * pipeline and turns a detected vegetable label into a short fun fact.
 */
class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.backend = null;
    this.currentTone = "normal";
  }

  /** Backend Adaptif: prefer WebGPU, fall back to WASM if init/inference fails. */
  async loadModel(onProgress) {
    const progressCallback = (event) => {
      if (event?.status === "progress" && event.total) {
        onProgress?.(event.loaded / event.total);
      }
    };

    const tryLoad = async (device) =>
      pipeline("text2text-generation", MODEL_CONFIG.factsModelId, {
        dtype: "q4",
        device,
        progress_callback: progressCallback,
      });

    const preferredDevice = isWebGPUSupported() ? "webgpu" : "wasm";

    try {
      this.generator = await tryLoad(preferredDevice);
      this.backend = preferredDevice;
    } catch (error) {
      logError(`RootFactsService - device "${preferredDevice}" failed, falling back to wasm`, error);
      this.generator = await tryLoad("wasm");
      this.backend = "wasm";
    }

    this.isModelLoaded = true;
    return { backend: this.backend };
  }

  setTone(tone) {
    this.currentTone = TONE_PERSONAS[tone] ? tone : "normal";
    return this.currentTone;
  }

  /** Strips anything that isn't a letter/space and caps the length, to keep
   * the label out of prompt-injection territory before it reaches the model. */
  #sanitizeInput(vegetable) {
    if (typeof vegetable !== "string") return "";
    return vegetable
      .normalize("NFKC")
      .replace(/[^a-zA-Z\s]/g, "")
      .trim()
      .slice(0, MAX_VEGETABLE_LENGTH);
  }

  #buildPrompt(vegetable, tone) {
    const persona = TONE_PERSONAS[tone] ?? TONE_PERSONAS.normal;
    return (
      `You are ${persona}. Share ONE short, unique, and surprising fun fact ` +
      `about the vegetable "${vegetable}". Respond in 1-2 sentences only.`
    );
  }

  async generateFacts(vegetable, tone = this.currentTone) {
    if (!this.isReady()) {
      throw new Error("Model fun fact belum siap.");
    }
    if (this.isGenerating) {
      throw new Error("Sedang membuat fakta menarik lain, mohon tunggu.");
    }

    const cleanVegetable = this.#sanitizeInput(vegetable);
    if (!cleanVegetable) {
      throw new Error("Nama sayuran tidak valid.");
    }

    this.isGenerating = true;

    try {
      const prompt = this.#buildPrompt(cleanVegetable, tone);

      // max_new_tokens kept at the documented ceiling (150) so local
      // generation stays responsive and doesn't freeze the browser tab.
      const output = await this.generator(prompt, {
        max_new_tokens: 150,
        temperature: 0.8,
        top_p: 0.9,
        do_sample: true,
      });

      const result = Array.isArray(output) ? output[0] : output;
      return (result?.generated_text ?? "").trim();
    } finally {
      this.isGenerating = false;
    }
  }

  isReady() {
    return Boolean(this.isModelLoaded && this.generator);
  }
}

export default RootFactsService;
