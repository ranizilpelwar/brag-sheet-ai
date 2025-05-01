// utils/ollamaClient.ts

type OllamaGenerateRequest = {
  prompt: string;
  model: string;
};

export const createOllamaClient = () => {
  const baseUrl = "http://localhost:11434";

  return {
    generate: async ({ prompt, model }: OllamaGenerateRequest) => {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model })
      });

      const text = await response.text(); // <- Read as text first

      try {
        // Try parsing JSON first
        const parsed = JSON.parse(text);
        if (parsed.response) {
          return parsed.response;
        } else {
          console.error("Unexpected parsed JSON:", parsed);
          throw new Error("Ollama API did not return 'response' field.");
        }
      } catch (err) {
        // If JSON parse fails, fallback to raw text
        console.warn("Failed to parse JSON, using raw text response instead");
        return text;
      }
    }
  };
};
