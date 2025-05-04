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

Your task is to analyze the following section from a brag sheet and identify the single most impactful accomplishment that would be most compelling to an engineering manager.

Input section:
${section}

Instructions:
1. Read the input section carefully
2. Identify the ONE accomplishment that best demonstrates these four key attributes:
   - Quantifiable Business Impact: Measurable improvements in revenue, cost savings, efficiency, or user metrics
   - Ownership and Initiative: Taking charge of critical projects, driving solutions, and making key decisions
   - Impact Across Teams/Systems: Projects that affected multiple teams, systems, or business units
   - High-Stakes Delivery: Successfully delivering complex, high-risk, or mission-critical projects
3. If multiple accomplishments are present, choose the one that best demonstrates all attributes
4. If no clear accomplishment is found, respond with "No clear technical accomplishments found in the input"

Output requirements:
- Write 1-2 sentences maximum
- Focus on the accomplishment that best demonstrates all attributes
- Include specific metrics or results if available
- Use professional, confident language
- Do not make up or exaggerate details
- Do not combine multiple accomplishments

Example format:
"Led [specific initiative] that [specific impact], resulting in [quantifiable outcome] and [broader business impact]."

Now, identify the single most impactful accomplishment that best demonstrates as many of the four key attributes as possible:
`;

  console.log("📝 Prompt being sent to model:", prompt);

  const output = await llm.generate({
    prompt,
    model
  });

  console.log("📝 Raw output from model:", output);

  res.status(200).json({ output });
}
