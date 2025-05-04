interface LLMClient {
  generate: (params: { prompt: string; model?: string }) => Promise<string>;
}

// Model-specific configurations
const MODEL_CONFIGS = {
  mistral: {
    temperature: 0.5, // Slightly higher temperature for better context understanding
    top_p: 0.9, // Higher top_p for better language modeling
    max_tokens: 200
  },
  llama2: {
    temperature: 0.5, // Slightly higher temperature for better context understanding
    top_p: 0.9, // Higher top_p for better language modeling
    max_tokens: 200
  }
};

class LiteLLMClient implements LLMClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = process.env.LITELLM_BASE_URL || "http://localhost:11434";
    this.apiKey = process.env.LITELLM_API_KEY;
  }

  async generate({
    prompt,
    model = "mistral"
  }: {
    prompt: string;
    model?: string;
  }): Promise<string> {
    try {
      console.log("🔍 Sending request to LiteLLM API...");
      console.log("🤖 Using model:", model);

      // Get model-specific configuration or use defaults
      const modelConfig = MODEL_CONFIGS[model] || MODEL_CONFIGS.mistral;

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: modelConfig
        })
      });

      console.log("🔍 LiteLLM API response status:", response.status);
      const data = await response.json();
      console.log("🔍 LiteLLM API raw response:", data);

      return data.response || "";
    } catch (error) {
      console.error("❌ LiteLLM generation error:", error);
      throw error;
    }
  }
}

export function getLLMClient(provider: string = "litellm"): LLMClient {
  if (provider.toLowerCase() !== "litellm") {
    throw new Error("Only LiteLLM provider is supported");
  }
  return new LiteLLMClient();
}

// List of supported models
export const SUPPORTED_MODELS = {
  // Local models (via Ollama)
  mistral: "Mistral 7B - Balanced model for general use",
  llama2: "Llama 2 7B - More creative, good for varied outputs"

  // Keep other models commented out until we implement them
  // "codellama": "CodeLlama - Specialized for code and technical content",
  // "mixtral": "Mixtral 8x7B - More powerful but requires more resources",
  // "gemma": "Gemma 7B - Google's latest open model",

  // Cloud models (via HuggingFace)
  // "huggingface/mistral-7b": "Mistral 7B via HuggingFace",
  // "huggingface/llama2-7b": "Llama 2 7B via HuggingFace",

  // Together AI models
  // "together/mistral-7b": "Mistral 7B via Together AI",
  // "together/llama2-7b": "Llama 2 7B via Together AI"
};
