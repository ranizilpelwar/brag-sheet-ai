import type { NextApiRequest, NextApiResponse } from "next";
import { buildPrompt } from "../../utils/promptTemplate";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { items, tone } = req.body;
  const prompt = buildPrompt(items, tone);

  try {
    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral", // or any local model you've downloaded
        prompt,
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error("Ollama Error Response:", errorText);
      return res
        .status(500)
        .json({
          error: "Failed to connect to Ollama. Make sure it is running."
        });
    }

    const data = await ollamaResponse.json();
    const output = data.response;

    res.status(200).json({ output });
  } catch (err: any) {
    console.error("Fetch Error:", err.message || err);
    res
      .status(500)
      .json({
        error: "Could not connect to Ollama. Is it running at localhost:11434?"
      });
  }
}
