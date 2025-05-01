import type { NextApiRequest, NextApiResponse } from "next";
import { createOllamaClient } from "../../utils/ollamaClient";

// Estimate tokens (1 token ≈ 4 characters)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

// Batch items based on token size (NOT just count)
const batchItemsByTokens = (
  items: string[],
  maxTokensPerBatch: number = 3000
): string[][] => {
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentBatchTokens = 0;

  for (const item of items) {
    const itemTokens = estimateTokens(item);

    if (currentBatchTokens + itemTokens > maxTokensPerBatch) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
      currentBatch = [item];
      currentBatchTokens = itemTokens;
    } else {
      currentBatch.push(item);
      currentBatchTokens += itemTokens;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
};

// Split oversized text into smaller paragraphs
const splitTextIntoParagraphs = (text: string): string[] => {
  return text.split(/\n\s*\n/).filter(Boolean); // Split by double newlines
};

// Recursive polishing function with dynamic splitting
const recursivelyPolishSections = async (
  sections: string[],
  tone: string,
  ollama: any
): Promise<string> => {
  if (sections.length === 1) {
    return sections[0]; // Done
  }

  const grouped = batchItemsByTokens(sections, 3000); // Token-aware batching

  console.log(`🔹 Polishing ${grouped.length} groups at this level`);

  let nextRoundPolished: string[] = [];

  for (let i = 0; i < grouped.length; i++) {
    const group = grouped[i];
    const combinedGroupText = group.join("\n\n");
    const tokenEstimate = estimateTokens(combinedGroupText);

    console.log(
      `📏 Group ${i + 1}/${grouped.length}, estimated ${tokenEstimate} tokens`
    );

    if (tokenEstimate > 7100) {
      // Too big even after grouping — split smaller
      console.warn(
        `⚠️ Group ${
          i + 1
        } too large (${tokenEstimate} tokens). Splitting further.`
      );

      const smallerParts = splitTextIntoParagraphs(combinedGroupText);

      if (smallerParts.length === 1) {
        // Even paragraph is too large! Break by sentences
        const sentences = combinedGroupText
          .split(/(?<=[.?!])\s+/)
          .filter(Boolean);
        const miniPolished = await recursivelyPolishSections(
          sentences,
          tone,
          ollama
        );
        nextRoundPolished.push(miniPolished);
      } else {
        const miniPolished = await recursivelyPolishSections(
          smallerParts,
          tone,
          ollama
        );
        nextRoundPolished.push(miniPolished);
      }
    } else {
      // Safe to polish normally
      const polishPrompt = `
You are an expert technical resume reviewer and writer.

Given the following brag sheet sections, combine and polish them into a single cohesive, professional summary.

Sections to merge:
${combinedGroupText}

Instructions:
- Maintain a ${tone} tone
- Use clear, assertive, professional writing
- Preserve structure if logical
      `;

      const output = await ollama.generate({
        prompt: polishPrompt,
        model: "mistral"
      });

      if (!output) {
        throw new Error(`Failed to polish group ${i + 1}`);
      }

      nextRoundPolished.push(output);
    }
  }

  // Recursively polish again
  return recursivelyPolishSections(nextRoundPolished, tone, ollama);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { summaries, tone } = req.body;

  if (!summaries || !Array.isArray(summaries)) {
    return res.status(400).json({ error: "Invalid input for summaries" });
  }

  try {
    const ollama = createOllamaClient();

    console.log(
      `🔹 Starting final polish: ${summaries.length} initial summaries`
    );

    const finalOutput = await recursivelyPolishSections(
      summaries,
      tone || "Professional",
      ollama
    );

    res.status(200).json({ output: finalOutput });
  } catch (error: any) {
    console.error("❌ Error finalizing polished output:", error.message);
    res.status(500).json({ error: "Failed to finalize polished output" });
  }
}
