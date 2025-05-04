import { getLLMClient, SUPPORTED_MODELS } from "../../llm/providers";

export default async function handler(req, res) {
  const { section, provider = "litellm", model = "mistral" } = req.body;

  // Validate model
  if (!Object.keys(SUPPORTED_MODELS).includes(model)) {
    return res.status(400).json({
      error: `Unsupported model. Available models: ${Object.keys(
        SUPPORTED_MODELS
      ).join(", ")}`
    });
  }

  console.log("🔍 Input section:", section);
  console.log("📝 Section length:", section.length);
  console.log("📝 Section preview:", section.substring(0, 200) + "...");
  console.log("🤖 Using model:", model);

  const llm = getLLMClient(provider);
  const prompt = `
You are a technical resume reviewer for Staff and Tech Lead roles.

Your task is to create a concise factual summary of the following section from a brag sheet.

Input section:
${section}

Instructions:
1. Read the input section carefully
2. Create a factual summary that captures the key points from the input
3. Focus on:
   - What was actually built or delivered
   - Specific technical details mentioned
   - Any metrics or results provided
4. Do not:
   - Add information not present in the input
   - Make assumptions about impact
   - Exaggerate or embellish details
5. If the input is empty or unclear, respond with "No clear technical details found in the input"

Output requirements:
- Write 1-2 sentences maximum
- Use only information present in the input
- Maintain the factual nature of the original content
- Use professional, confident language

Now, create a factual summary of the input:
`;

  console.log("📝 Prompt being sent to model:", prompt);

  const output = await llm.generate({
    prompt,
    model
  });

  console.log("📝 Raw output from model:", output);

  res.status(200).json({ output });
}
