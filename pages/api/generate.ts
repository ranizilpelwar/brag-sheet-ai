import type { NextApiRequest, NextApiResponse } from "next";
import { buildPrompt } from "../../utils/buildPrompt";
import { createOllamaClient } from "../../utils/ollamaClient";
import fs from "fs";
import path from "path";

// Helper function to batch items into smaller chunks
const batchItems = (items: string[], chunkSize: number = 8): string[][] => {
  const batches = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    batches.push(items.slice(i, i + chunkSize));
  }
  return batches;
};
const saveSummaries = (batchSummaries: string[]) => {
  console.log("Attempting to save summaries");
  try {
    const filePath = path.join(process.cwd(), "summaries-debug.json");
    fs.writeFileSync(filePath, JSON.stringify(batchSummaries, null, 2));
    console.log(`✅ Summaries saved at ${filePath}`);
  } catch (error) {
    console.error("❌ Error saving summaries:", error);
  }
};
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

    // 1. Split large input into batches
    const batches = batchItems(items, 8);

    let batchSummaries: string[] = [];

    for (const batch of batches) {
      const prompt = buildPrompt(batch, tone || "Professional");

      // First round: summarize each batch separately
      const response = await ollama.generate({
        prompt,
        model: "mistral"
      });

      if (!response) {
        throw new Error("No response from Ollama for batch");
      }
      console.log("response:/n", response);
      batchSummaries.push(response);
    }
    saveSummaries(batchSummaries);

    // 2. Merge batch summaries into one final prompt
    const finalPrompt = `
You are an expert technical resume reviewer.

Given the following summarized outputs, organize and polish them into the final brag sheet format.

Summaries:
${batchSummaries.join("\n\n")}

Instructions:
- Maintain a ${tone || "Professional"} tone
- Keep the structure organized under headings
- Be concise, assertive, and polished
    `;

    // 3. Final round: get the fully merged output
    const finalOutput = await ollama.generate({
      prompt: finalPrompt,
      model: "mistral"
    });

    if (!finalOutput) {
      throw new Error("No response from Ollama for final summary");
    }

    res.status(200).json({ output: finalOutput });
  } catch (error: any) {
    console.error("Error generating output:", error.message);
    res.status(500).json({ error: "Failed to generate output" });
  }
}
