import type { NextApiRequest, NextApiResponse } from "next";
import { buildPrompt } from "../../utils/buildPrompt";
import { createOllamaClient } from "../../utils/ollamaClient";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { items, tone } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const ollama = createOllamaClient();
    const prompt = buildPrompt(items, tone || "Professional");

    const output = await ollama.generate({
      prompt,
      model: "mistral"
    });

    res.status(200).json({ output });
  } catch (error: any) {
    console.error("Error generating single batch:", error.message);
    res.status(500).json({ error: "Failed to generate batch output" });
  }
}
