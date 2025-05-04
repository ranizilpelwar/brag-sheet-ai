interface LLMClient {
  generate: (params: { prompt: string; model?: string }) => Promise<string>;
}

class OllamaClient implements LLMClient {
  async generate({
    prompt,
    model = "mistral"
  }: {
    prompt: string;
    model?: string;
  }): Promise<string> {
    try {
      console.log("🔍 Sending request to Ollama API...");
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
        })
      });

      console.log("🔍 Ollama API response status:", response.status);
      const data = await response.json();
      console.log("🔍 Ollama API raw response:", data);

      return data.response || "";
    } catch (error) {
      console.error("❌ Ollama generation error:", error);
      throw error;
    }
  }
}

export function getLLMClient(provider: string = "ollama"): LLMClient {
  if (provider.toLowerCase() !== "ollama") {
    throw new Error("Only Ollama provider is supported");
  }
  return new OllamaClient();
}
