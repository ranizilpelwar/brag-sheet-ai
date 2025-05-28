// utils/ollamaClient.ts

type OllamaGenerateRequest = {
  prompt: string;
  model: string;
};

// Model-specific configurations
const MODEL_CONFIGS = {
  mistral: {
    timeout: 900000, // 15 minutes
    maxTokens: 200
  },
  llama2: {
    timeout: 900000, // 15 minutes
    maxTokens: 200
  }
};

export const createOllamaClient = () => {
  const baseUrl = "http://localhost:11434";

  return {
    generate: async ({ prompt, model }: OllamaGenerateRequest) => {
      try {
        const modelConfig = MODEL_CONFIGS[model] || MODEL_CONFIGS.mistral;
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          modelConfig.timeout
        );

        console.log(
          `🤖 Using model: ${model} with timeout: ${
            modelConfig.timeout / 60000
          } minutes`
        );

        const response = await fetch(`${baseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            model,
            stream: true, // Enable streaming
            options: {
              num_predict: modelConfig.maxTokens
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Ollama API error: ${response.status} ${response.statusText}`
          );
        }

        if (!response.body) {
          throw new Error("No response body received");
        }

        const reader = response.body.getReader();
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Convert the Uint8Array to text
          const text = new TextDecoder().decode(value);
          const lines = text.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                fullResponse += data.response;
              }
            } catch (e) {
              console.warn("Failed to parse streaming response line:", line);
            }
          }
        }

        return fullResponse;
      } catch (error: any) {
        if (error.name === "AbortError") {
          throw new Error(
            `Request timed out after ${
              MODEL_CONFIGS[model]?.timeout / 60000 || 5
            } minutes. The ${model} model might be taking too long to respond. Try reducing the input size or using a different model.`
          );
        }
        throw error;
      }
    }
  };
};
