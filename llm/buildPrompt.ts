// utils/buildPrompt.ts
export const staticInstructions = `
You are an expert technical resume reviewer and career coach specializing in Staff Engineer and Tech Lead roles.

Given the following work notes and accomplishments, categorize and summarize the accomplishments under the following headings:

- Quantifiable High-Impact Stories (metrics-driven improvements: "increased X by Y%", "reduced cost by Z%", etc.)
- Delivery Wins / What You Built (specific features, services, technical products delivered)
- Consulting Wins / How You Influenced (consultative leadership, influence on client outcomes, client-facing wins)
- 8th Light Wins / How You Helped the Company (internal impact: mentoring, brand building, speaking, recruiting, process improvements)

**Important Rules**:
- Only categorize based on what is explicitly supported by the input notes. **Do not fabricate or exaggerate accomplishments.**
- If a note matches multiple categories, place it in the one that is the most relevant or impactful.
- If no accomplishments fit a category, omit that section entirely.

For each non-empty category:
- Write a concise paragraph (3–4 sentences maximum) summarizing the strongest accomplishments in that category.
- Use strong action verbs and measurable results where possible.
- Maintain a Professional tone throughout.
- Make the writing polished, assertive, and professional, without unnecessary jargon.

Format your response exactly like this:
## Quantifiable High-Impact Stories
[Concise paragraph]

## Delivery Wins / What You Built
[Concise paragraph]

## Consulting Wins / How You Influenced
[Concise paragraph]

## Company Wins / How You Helped the Company
[Concise paragraph]

Work notes:
`;

export const conciseInstructions = `
You are a technical resume reviewer for Staff and Tech Lead roles.

Focus ONLY on the "Delivery Wins / What You Built" section.

Instructions:
- Identify 1–2 accomplishments showing the strongest technical delivery impact.
- Look for major systems built, critical features shipped, or strategic execution.
- Pick examples that would impress an Engineering Manager.

Output:
- Summarize selected accomplishments professionally and assertively.
- Emphasize measurable results, technical challenge, or business value.
- Keep tone crisp, confident, and factual.
`;

export const buildPrompt = (
  rawItems: string[],
  instructions: string = conciseInstructions,
  tone: string = "Professional"
) => {
  return `
${instructions}
Input:
${rawItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}
Output Summary:
`;
};

export const buildSectionPrompt = (section: string) => `
You are a technical resume reviewer for Staff and Tech Lead roles.

Input: 
- ${section}

Instructions:
- Identify 1–2 accomplishments showing the strongest impact.
- Look for major systems built, critical features shipped, or strategic execution.
- Pick examples that would impress an Engineering Manager.

Output:
- Summarize selected accomplishments professionally and assertively.
- Emphasize measurable results, technical challenge, or business value.
- Keep tone crisp, confident, and factual.
`;
