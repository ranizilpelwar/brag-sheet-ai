import { getLLMClient, SUPPORTED_MODELS } from "../../llm/providers";

// Increase the API route timeout to 15 minutes
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb"
    },
    responseLimit: "1mb",
    externalResolver: true
  },
  maxDuration: 900 // 15 minutes in seconds
};

export default async function handler(req, res) {
  const { section, provider = "litellm", model = "mistral" } = req.body;

  // Validate input
  if (!section || section.trim() === "") {
    return res.status(400).json({ error: "Section content cannot be empty" });
  }

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
You're a technical resume reviewer. From the section below, pick ONE accomplishment that best shows:

- Business impact (metrics)
- Ownership
- Cross-team or cross-system work
- High-stakes delivery

Use SBI format:  
"Situation: [context]. Behavior: [actions]. Impact: [results]."

Section: ${section}

`;

  console.log("📝 Prompt being sent to model:", prompt);

  const output = await llm.generate({
    prompt,
    model
  });

  console.log("📝 Raw output from model:", output);

  res.status(200).json({ output });
}
